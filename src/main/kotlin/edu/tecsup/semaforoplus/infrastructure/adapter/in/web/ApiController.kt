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
        val cam1 = node.cameras.getOrNull(0)
        val cam2 = node.cameras.getOrNull(1)

        return listOf(
            mapOf(
                "id" to "CAM-01",
                "int" to "INT-01",
                "name" to "ESP32-CAM 01 · Poste Norte (Av. Ejército)",
                "status" to if (cam1?.isOnline == true) "En línea" else "Sin señal",
                "ip" to (cam1?.ipAddress ?: "192.168.1.51"),
                "carril" to "Av. Ejército (Norte–Sur)",
                "confidence" to (cam1?.confidenceScore ?: 0.0),
                "fps" to (cam1?.fps ?: 0),
                "latency" to (cam1?.inferenceLatencyMs ?: 0),
                "veh" to (cam1?.classification?.totalVehicles ?: 0)
            ),
            mapOf(
                "id" to "CAM-02",
                "int" to "INT-01",
                "name" to "ESP32-CAM 02 · Poste Este (Calle Los Arces)",
                "status" to if (cam2?.isOnline == true) "En línea" else "Sin señal",
                "ip" to (cam2?.ipAddress ?: "192.168.1.52"),
                "carril" to "Calle Los Arces (Este–Oeste)",
                "confidence" to (cam2?.confidenceScore ?: 0.0),
                "fps" to (cam2?.fps ?: 0),
                "latency" to (cam2?.inferenceLatencyMs ?: 0),
                "veh" to (cam2?.classification?.totalVehicles ?: 0)
            )
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

    @PostMapping("/iot/simulate-telemetry")
    fun simulateTelemetry(): Map<String, Any> {
        // Enlaza la ESP32 central y las dos ESP32-CAM con datos de prueba reales para verificar el cruce
        getRealtimeNodeUseCase.updateCamDetection(
            camId = "CAM-01",
            classification = VehicleClassification(autos = 11, combis = 3, motos = 2, peatones = 4, unidadesEmergencia = 0),
            latencyMs = 142,
            fps = 20
        )
        getRealtimeNodeUseCase.updateCamDetection(
            camId = "CAM-02",
            classification = VehicleClassification(autos = 5, combis = 1, motos = 2, peatones = 3, unidadesEmergencia = 0),
            latencyMs = 155,
            fps = 20
        )
        val node = getRealtimeNodeUseCase.updateEsp32Telemetry(
            sem1State = "GREEN",
            sem2State = "RED",
            remainingSec = 24,
            sem1Allocated = 41,
            sem2Allocated = 19,
            batteryVoltage = 13.6,
            batteryPercent = 96,
            powerSource = "HÍBRIDO (Solar LiFePO4)",
            emergencyActive = false
        )
        return mapOf(
            "status" to "SUCCESS",
            "message" to "Telemetría simulada inyectada en INT-01",
            "nodeCode" to node.code,
            "iotConnected" to node.iotConnected
        )
    }

    @PostMapping("/iot/disconnect-all")
    fun disconnectAll(): Map<String, Any> {
        // Simula la desconexión total para probar el estado sin señal y alerta
        val node = getRealtimeNodeUseCase.getNode()
        return mapOf(
            "status" to "TIMEOUT_TRIGGERED",
            "message" to "Estado sin señal activado (hardware en espera)"
        )
    }

    // =========================================================================
    // ENDPOINTS DE AUTO-ACTUALIZACIÓN INALÁMBRICA (HTTP OTA FIRMWARE)
    // =========================================================================

    // Mapa en memoria con la versión disponible en el servidor
    private val availableFirmwareVersions = java.util.concurrent.ConcurrentHashMap<String, String>().apply {
        put("ESP32-CENTRAL", "2.4.1")
        put("ESP32-CAM-NORTE", "2.4.1")
        put("ESP32-CAM-ESTE", "2.4.1")
    }

    @GetMapping("/iot/firmware/check-update")
    fun checkFirmwareUpdate(
        @RequestParam(defaultValue = "ESP32-CENTRAL") device: String,
        @RequestParam(defaultValue = "1.0.0") currentVersion: String
    ): Map<String, Any> {
        val latestVersion = availableFirmwareVersions[device] ?: "2.4.1"
        val hasUpdate = latestVersion != currentVersion
        return mapOf(
            "device" to device,
            "currentVersion" to currentVersion,
            "latestVersion" to latestVersion,
            "updateAvailable" to hasUpdate,
            "downloadUrl" to "/api/v1/iot/firmware/download/$device"
        )
    }

    @PostMapping("/iot/firmware/publish-version")
    fun publishNewVersion(
        @RequestParam device: String,
        @RequestParam version: String
    ): Map<String, Any> {
        availableFirmwareVersions[device] = version
        return mapOf(
            "status" to "VERSION_PUBLISHED",
            "device" to device,
            "newLatestVersion" to version
        )
    }

    @GetMapping("/iot/firmware/download/{device}")
    fun downloadFirmware(@PathVariable device: String): ResponseEntity<org.springframework.core.io.Resource> {
        val binFileName = when (device) {
            "ESP32-CENTRAL" -> "esp32_central_controller.ino.bin"
            "ESP32-CAM-NORTE" -> "esp32_cam_norte.ino.bin"
            "ESP32-CAM-ESTE" -> "esp32_cam_este.ino.bin"
            else -> "firmware.bin"
        }
        val file = java.io.File("firmware/builds/$binFileName")
        if (!file.exists()) {
            return ResponseEntity.notFound().build()
        }
        val resource = org.springframework.core.io.FileSystemResource(file)
        return ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"$binFileName\"")
            .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
            .body(resource)
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
