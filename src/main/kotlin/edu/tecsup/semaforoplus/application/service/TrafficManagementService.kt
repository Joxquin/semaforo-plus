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
    private val loadIncidentPort: LoadIncidentPort,
    private val realtimeNodeService: RealtimeNodeService
) : GetIntersectionsUseCase,
    GetIncidentsUseCase,
    GetTelemetryUseCase,
    GetProjectInfoUseCase {

    override fun getIntersections(): List<Intersection> {
        val dbIntersections = loadIntersectionPort.findAll()
        val node = realtimeNodeService.getNode()
        if (dbIntersections.isEmpty()) {
            return listOf(
                Intersection(
                    id = 1L,
                    code = "INT-01",
                    name = "Av. Ejército × Av. Salaverry",
                    zone = "Yanahuara",
                    status = if (node.iotConnected) "Operativa" else "Sin datos",
                    mode = if (node.activeEmergencyPriority) "ONDA VERDE EMERGENCIA" else "ESP32 Adaptativo (Local 100%)",
                    congestionPercent = if (node.iotConnected) 34 else 0,
                    greenNsSeconds = node.trafficLights.find { it.id == "SEM-01" }?.greenSecondsAllocated ?: 38,
                    greenEwSeconds = node.trafficLights.find { it.id == "SEM-02" }?.greenSecondsAllocated ?: 30,
                    solarBatteryLevel = node.solarBackup.batteryPercent,
                    esp32Status = node.esp32CentralStatus,
                    esp32CamStatus = "2/2 ESP32-CAM Activas (ML On-Edge)",
                    emergencyPriorityActive = node.activeEmergencyPriority
                )
            )
        }
        return dbIntersections.map { inter ->
            if (inter.code == "INT-01") {
                inter.copy(
                    status = if (node.iotConnected) "Operativa" else "Sin datos",
                    mode = if (node.activeEmergencyPriority) "ONDA VERDE EMERGENCIA" else "ESP32 Adaptativo (Local 100%)",
                    solarBatteryLevel = node.solarBackup.batteryPercent,
                    esp32Status = node.esp32CentralStatus,
                    emergencyPriorityActive = node.activeEmergencyPriority
                )
            } else {
                inter
            }
        }
    }

    override fun getIncidents(): List<Incident> {
        return loadIncidentPort.findAll()
    }

    override fun getTelemetry(): Telemetry {
        val node = realtimeNodeService.getNode()
        val incidents = loadIncidentPort.findAll()
        val openIncidents = incidents.count { it.status != "Resuelta" }.toLong()
        val activeEmergency = if (node.activeEmergencyPriority) 1 else 0

        return Telemetry(
            activeNodes = 1L,
            averageSolarBattery = "${node.solarBackup.batteryPercent}% (${node.solarBackup.batteryVoltage}V)",
            activeEmergencyPriorities = activeEmergency,
            openIncidents = openIncidents,
            esp32CamStatus = "2/2 ESP32-CAM (XGA 20fps)",
            avgGreenTimeGainSeconds = 16
        )
    }

    override fun getProjectInfo(): ProjectInfo {
        return ProjectInfo()
    }
}
