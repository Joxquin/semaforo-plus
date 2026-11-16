package edu.tecsup.semaforoplus.infrastructure.adapter.`in`.web

import edu.tecsup.semaforoplus.application.port.`in`.*
import edu.tecsup.semaforoplus.domain.model.*
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

data class CamDetectionPayload(
    val camId: String = "CAM-01",
    val carril: String? = null,
    val autos: Int = 0,
    val combis: Int = 0,
    val motos: Int = 0,
    val peatones: Int = 0,
    val unidadesEmergencia: Int = 0,
    val latencyMs: Int = 140,
    val fps: Int = 20
)

data class Esp32CentralPayload(
    val deviceId: String = "ESP32-CENTRAL-01",
    val nodeCode: String = "NODE-01",
    val sem1State: String = "GREEN",
    val sem2State: String = "RED",
    val remainingSeconds: Int = 30,
    val sem1AllocatedSeconds: Int = 30,
    val sem2AllocatedSeconds: Int = 30,
    val batteryVoltage: Double = 13.6,
    val batteryPercent: Int = 96,
    val powerSource: String = "HÍBRIDO (Solar LiFePO4)",
    val emergencyActive: Boolean = false
)

@RestController
@RequestMapping("/api/v1")
class ApiController(
    private val getIntersectionsUseCase: GetIntersectionsUseCase,
    private val getIncidentsUseCase: GetIncidentsUseCase,
    private val getTelemetryUseCase: GetTelemetryUseCase,
    private val getProjectInfoUseCase: GetProjectInfoUseCase,
    private val getRealtimeNodeUseCase: GetRealtimeNodeUseCase
) {

    @GetMapping("/info")
    fun getInfo(): ProjectInfo {
        return getProjectInfoUseCase.getProjectInfo()
    }

    @GetMapping("/intersections")
    fun getIntersections(): List<Intersection> {
        return getIntersectionsUseCase.getIntersections()
    }

    @GetMapping("/cameras")
    fun getCameras(): List<Map<String, Any>> {
        val node = getRealtimeNodeUseCase.getNode()
        val cam1Online = node.cameras.getOrNull(0)?.isOnline == true
        val cam2Online = node.cameras.getOrNull(1)?.isOnline == true

        return listOf(
            mapOf("id" to "CAM-01", "int" to "INT-01", "name" to "Salaverry · acceso norte (ESP32-CAM 01)", "status" to if (cam1Online) "En línea" else "Sin señal"),
            mapOf("id" to "CAM-02", "int" to "INT-02", "name" to "Goyeneche · cruce principal", "status" to "En línea"),
            mapOf("id" to "CAM-03", "int" to "INT-02", "name" to "Parra · acceso este", "status" to "Degradada"),
            mapOf("id" to "CAM-04", "int" to "INT-03", "name" to "Dolores · Mariscal Castilla", "status" to "En línea"),
            mapOf("id" to "CAM-05", "int" to "INT-05", "name" to "Kennedy · Ejército (ESP32-CAM 02)", "status" to if (cam2Online) "En línea" else "Sin señal"),
            mapOf("id" to "CAM-06", "int" to "INT-06", "name" to "Puente Bolognesi · sentido sur", "status" to "En línea"),
            mapOf("id" to "CAM-07", "int" to "INT-07", "name" to "Aviación · Alcides Carrión", "status" to "En línea"),
            mapOf("id" to "CAM-08", "int" to "INT-08", "name" to "La Marina · Metropolitana", "status" to "Sin señal")
        )
    }

    @GetMapping("/incidents")
    fun getIncidents(): List<Incident> {
        return getIncidentsUseCase.getIncidents()
    }

    @GetMapping("/telemetry")
    fun getTelemetry(): Telemetry {
        return getTelemetryUseCase.getTelemetry()
    }

    // --- REAL-TIME DUAL-LIGHT & DUAL-CAMERA ENDPOINTS ---

    @GetMapping("/realtime/node")
    fun getRealtimeNode(): TrafficNode {
        return getRealtimeNodeUseCase.getNode()
    }

    @GetMapping("/realtime/cameras")
    fun getRealtimeCameras(): List<Esp32Cam> {
        return getRealtimeNodeUseCase.getCameras()
    }

    @GetMapping("/realtime/traffic-lights")
    fun getRealtimeTrafficLights(): List<TrafficLight> {
        return getRealtimeNodeUseCase.getTrafficLights()
    }

    @PostMapping("/realtime/emergency-trigger")
    fun triggerEmergency(@RequestParam(defaultValue = "CAM-01") camId: String): TrafficNode {
        return getRealtimeNodeUseCase.triggerEmergencyPriority(camId)
    }

    @PostMapping("/realtime/emergency-reset")
    fun resetEmergency(): TrafficNode {
        return getRealtimeNodeUseCase.resetEmergencyPriority()
    }

    @PostMapping("/realtime/esp32cam/{camId}/detection")
    fun updateCamDetection(
        @PathVariable camId: String,
        @RequestBody classification: VehicleClassification
    ): Esp32Cam {
        return getRealtimeNodeUseCase.updateCamDetection(camId, classification)
    }

    @PostMapping("/realtime/esp32/telemetry")
    fun updateSolarTelemetry(
        @RequestParam batteryPercent: Int,
        @RequestParam voltage: Double,
        @RequestParam(defaultValue = "HÍBRIDO (Solar + Red)") powerSource: String
    ): TrafficNode {
        return getRealtimeNodeUseCase.updateSolarTelemetry(batteryPercent, voltage, powerSource)
    }

    // --- DIRECT IOT INGESTION ENDPOINTS (CALLED FROM .ino FIRMWARE) ---

    @PostMapping("/iot/cam/detection")
    fun ingestCamDetection(@RequestBody payload: CamDetectionPayload): ResponseEntity<Map<String, Any>> {
        val classification = VehicleClassification(
            autos = payload.autos,
            combis = payload.combis,
            motos = payload.motos,
            peatones = payload.peatones,
            unidadesEmergencia = payload.unidadesEmergencia
        )
        val cam = getRealtimeNodeUseCase.updateCamDetection(
            camId = payload.camId,
            classification = classification,
            latencyMs = payload.latencyMs,
            fps = payload.fps
        )
        return ResponseEntity.ok(
            mapOf(
                "status" to "ACK",
                "receivedAt" to System.currentTimeMillis(),
                "camId" to cam.id,
                "online" to cam.isOnline
            )
        )
    }

    @PostMapping("/iot/esp32/telemetry")
    fun ingestEsp32Telemetry(@RequestBody payload: Esp32CentralPayload): ResponseEntity<Map<String, Any>> {
        val node = getRealtimeNodeUseCase.updateEsp32Telemetry(
            sem1State = payload.sem1State,
            sem2State = payload.sem2State,
            remainingSec = payload.remainingSeconds,
            sem1Allocated = payload.sem1AllocatedSeconds,
            sem2Allocated = payload.sem2AllocatedSeconds,
            batteryVoltage = payload.batteryVoltage,
            batteryPercent = payload.batteryPercent,
            powerSource = payload.powerSource,
            emergencyActive = payload.emergencyActive
        )
        return ResponseEntity.ok(
            mapOf(
                "status" to "ACK",
                "receivedAt" to System.currentTimeMillis(),
                "nodeCode" to node.code,
                "centralStatus" to node.esp32CentralStatus
            )
        )
    }

    @GetMapping("/auth/me")
    fun getCurrentUser(authentication: Authentication?): Map<String, Any?> {
        return if (authentication != null && authentication.isAuthenticated) {
            mapOf(
                "authenticated" to true,
                "username" to authentication.name,
                "authorities" to authentication.authorities.map { it.authority }
            )
        } else {
            mapOf("authenticated" to false)
        }
    }
}
