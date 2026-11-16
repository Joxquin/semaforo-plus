package edu.tecsup.semaforoplus.controller

import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.domain.model.Intersection
import edu.tecsup.semaforoplus.domain.repository.IncidentRepository
import edu.tecsup.semaforoplus.domain.repository.IntersectionRepository
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1")
class ApiController(
    private val intersectionRepository: IntersectionRepository,
    private val incidentRepository: IncidentRepository
) {

    @GetMapping("/info")
    fun getInfo(): Map<String, Any> {
        return mapOf(
            "project" to "Semáforo+",
            "institution" to "TECSUP (Arequipa)",
            "goal" to "ODS 11: Ciudades y comunidades sostenibles",
            "methodology" to "Design Thinking",
            "problemDiagnostic" to mapOf(
                "citizensAffectedPercentage" to 69,
                "annualHoursLostPerDriver" to 154,
                "targetAvenue" to "Av. Ejército"
            ),
            "architecture" to mapOf(
                "type" to "Retrofit adaptativo",
                "microcontroller" to "ESP32",
                "computerVision" to "ESP32-CAM",
                "modeling3D" to "Tinkercad",
                "uiDesign" to "Figma",
                "features" to listOf(
                    "Ajuste dinámico de tiempo verde por demanda real",
                    "Priorización de vehículos de emergencia y transporte público",
                    "Respaldo energético solar y modo autónomo"
                )
            ),
            "status" to "ONLINE"
        )
    }

    @GetMapping("/intersections")
    fun getIntersections(): List<Intersection> {
        return intersectionRepository.findAll()
    }

    @GetMapping("/incidents")
    fun getIncidents(): List<Incident> {
        return incidentRepository.findAll()
    }

    @GetMapping("/telemetry")
    fun getTelemetry(): Map<String, Any> {
        val totalIntersections = intersectionRepository.count()
        val incidents = incidentRepository.findAll()
        val openIncidents = incidents.count { it.status != "Resuelta" }
        return mapOf(
            "activeNodes" to totalIntersections,
            "averageSolarBattery" to "92.4%",
            "activeEmergencyPriorities" to 1,
            "openIncidents" to openIncidents,
            "esp32CamStatus" to "6/6 Activas",
            "avgGreenTimeGainSeconds" to 14
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
