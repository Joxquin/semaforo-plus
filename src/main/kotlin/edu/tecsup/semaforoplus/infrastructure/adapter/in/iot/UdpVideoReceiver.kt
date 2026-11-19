package edu.tecsup.semaforoplus.infrastructure.adapter.`in`.iot

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Receptor UDP de ultra baja latencia para streaming de video ESP32-CAM.
 * Protocolo de datagramas:
 * Header (12 bytes):
 *   [0..5]:  camId ASCII (6 bytes padded con espacios, ej "CAM-01")
 *   [6..7]:  frameId (short, unsigned)
 *   [8]:     partIndex (byte, 0-based)
 *   [9]:     totalParts (byte)
 *   [10..11]: payloadLength (short, unsigned)
 *   [12..]:   JPEG payload chunk
 */
@Component
class UdpVideoReceiver {
    private val log = LoggerFactory.getLogger(UdpVideoReceiver::class.java)
    private val port = 5005
    private var socket: DatagramSocket? = null
    @Volatile private var running = false
    private val executor = Executors.newSingleThreadExecutor()

    // Último frame completo por cámara disponible inmediatamente
    val latestFrames = ConcurrentHashMap<String, ByteArray>()
    val latestTimestamps = ConcurrentHashMap<String, Long>()

    // Estructura de ensamblaje en memoria
    private class InProgressFrame(
        val frameId: Int,
        val totalParts: Int,
        val parts: Array<ByteArray?>,
        var receivedParts: Int = 0,
        val createdAt: Long = System.currentTimeMillis()
    )

    private val activeFrames = ConcurrentHashMap<String, InProgressFrame>()

    @PostConstruct
    fun start() {
        try {
            socket = DatagramSocket(port)
            socket?.receiveBufferSize = 1024 * 1024 // 1MB buffer para evitar descartes en ráfagas
            running = true
            executor.submit { receiveLoop() }
            log.info("[UDP VIDEO] Servidor UDP de streaming iniciado en el puerto {}", port)
        } catch (e: Exception) {
            log.error("[UDP VIDEO] Error al abrir DatagramSocket en puerto {}: {}", port, e.message)
        }
    }

    private fun receiveLoop() {
        val buffer = ByteArray(2048) // Cada chunk mide ~1024 bytes
        val packet = DatagramPacket(buffer, buffer.size)

        while (running && socket != null && !socket!!.isClosed) {
            try {
                socket!!.receive(packet)
                val len = packet.length
                if (len < 12) continue // Paquete truncado

                val bb = ByteBuffer.wrap(packet.data, 0, len)
                val camIdBytes = ByteArray(6)
                bb.get(camIdBytes)
                val camId = String(camIdBytes).trim()

                val frameId = bb.short.toInt() and 0xFFFF
                val partIndex = bb.get().toInt() and 0xFF
                val totalParts = bb.get().toInt() and 0xFF
                val chunkLen = bb.short.toInt() and 0xFFFF

                if (partIndex >= totalParts || chunkLen <= 0 || bb.remaining() < chunkLen) {
                    continue
                }

                val chunkData = ByteArray(chunkLen)
                bb.get(chunkData)

                handleChunk(camId, frameId, partIndex, totalParts, chunkData)

            } catch (e: Exception) {
                if (running) {
                    log.debug("[UDP VIDEO] Excepción en lectura de paquete UDP: {}", e.message)
                }
            }
        }
    }

    private fun handleChunk(camId: String, frameId: Int, partIndex: Int, totalParts: Int, chunk: ByteArray) {
        val current = activeFrames[camId]
        val frame = if (current != null && current.frameId == frameId) {
            current
        } else {
            // Nuevo frame entrante (o el anterior quedó obsoleto)
            val newFrame = InProgressFrame(frameId, totalParts, arrayOfNulls(totalParts))
            activeFrames[camId] = newFrame
            newFrame
        }

        if (frame.parts[partIndex] == null) {
            frame.parts[partIndex] = chunk
            frame.receivedParts++

            // Si se recibieron todas las partes del fotograma, reensamblar de inmediato
            if (frame.receivedParts == frame.totalParts) {
                var totalBytes = 0
                for (p in frame.parts) {
                    totalBytes += p?.size ?: 0
                }
                val fullJpeg = ByteArray(totalBytes)
                var offset = 0
                for (p in frame.parts) {
                    if (p != null) {
                        System.arraycopy(p, 0, fullJpeg, offset, p.size)
                        offset += p.size
                    }
                }

                latestFrames[camId] = fullJpeg
                latestTimestamps[camId] = System.currentTimeMillis()
                activeFrames.remove(camId)
            }
        }
    }

    @PreDestroy
    fun stop() {
        running = false
        try {
            socket?.close()
        } catch (_: Exception) {}
        executor.shutdownNow()
        log.info("[UDP VIDEO] Servidor UDP detenido.")
    }
}
