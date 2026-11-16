package edu.tecsup.semaforoplus.infrastructure.adapter.`in`.web

import edu.tecsup.semaforoplus.application.port.`in`.GetIncidentsUseCase
import edu.tecsup.semaforoplus.application.port.`in`.GetIntersectionsUseCase
import edu.tecsup.semaforoplus.application.port.`in`.GetProjectInfoUseCase
import edu.tecsup.semaforoplus.application.port.`in`.GetTelemetryUseCase
import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.domain.model.Intersection
import edu.tecsup.semaforoplus.domain.model.ProjectInfo
import edu.tecsup.semaforoplus.domain.model.Telemetry
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1")
class ApiController(
    private val getIntersectionsUseCase: GetIntersectionsUseCase,
    private val getIncidentsUseCase: GetIncidentsUseCase,
    private val getTelemetryUseCase: GetTelemetryUseCase,
    private val getProjectInfoUseCase: GetProjectInfoUseCase
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
