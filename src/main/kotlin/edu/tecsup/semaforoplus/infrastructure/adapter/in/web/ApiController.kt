package edu.tecsup.semaforoplus.infrastructure.adapter.`in`.web

import edu.tecsup.semaforoplus.application.port.`in`.*
import edu.tecsup.semaforoplus.domain.model.*
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

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
