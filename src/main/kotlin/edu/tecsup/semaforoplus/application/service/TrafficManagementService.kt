package edu.tecsup.semaforoplus.application.service

import edu.tecsup.semaforoplus.application.port.`in`.GetIncidentsUseCase
import edu.tecsup.semaforoplus.application.port.`in`.GetIntersectionsUseCase
import edu.tecsup.semaforoplus.application.port.`in`.GetProjectInfoUseCase
import edu.tecsup.semaforoplus.application.port.`in`.GetTelemetryUseCase
import edu.tecsup.semaforoplus.application.port.out.LoadIncidentPort
import edu.tecsup.semaforoplus.application.port.out.LoadIntersectionPort
import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.domain.model.Intersection
import edu.tecsup.semaforoplus.domain.model.ProjectInfo
import edu.tecsup.semaforoplus.domain.model.Telemetry
import org.springframework.stereotype.Service

@Service
class TrafficManagementService(
    private val loadIntersectionPort: LoadIntersectionPort,
    private val loadIncidentPort: LoadIncidentPort
) : GetIntersectionsUseCase,
    GetIncidentsUseCase,
    GetTelemetryUseCase,
    GetProjectInfoUseCase {

    override fun getIntersections(): List<Intersection> {
        return loadIntersectionPort.findAll()
    }

    override fun getIncidents(): List<Incident> {
        return loadIncidentPort.findAll()
    }

    override fun getTelemetry(): Telemetry {
        val totalNodes = loadIntersectionPort.count()
        val incidents = loadIncidentPort.findAll()
        val openIncidents = incidents.count { it.status != "Resuelta" }.toLong()
        val activeEmergency = incidents.count { it.status == "En curso" && it.title.contains("emergencia", ignoreCase = true) }

        return Telemetry(
            activeNodes = totalNodes,
            averageSolarBattery = "92.4%",
            activeEmergencyPriorities = if (activeEmergency > 0) activeEmergency else 1,
            openIncidents = openIncidents,
            esp32CamStatus = "$totalNodes/$totalNodes Activas",
            avgGreenTimeGainSeconds = 14
        )
    }

    override fun getProjectInfo(): ProjectInfo {
        return ProjectInfo()
    }
}
