package edu.tecsup.semaforoplus

import edu.tecsup.semaforoplus.application.port.out.LoadIncidentPort
import edu.tecsup.semaforoplus.application.port.out.LoadIntersectionPort
import edu.tecsup.semaforoplus.application.service.RealtimeNodeService
import edu.tecsup.semaforoplus.application.service.TrafficManagementService
import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.domain.model.VehicleClassification
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.mockito.Mockito.mock
import java.time.LocalDateTime

class TrafficManagementServiceTest {

    private val loadIntersectionPort = mock(LoadIntersectionPort::class.java)
    private val loadIncidentPort = mock(LoadIncidentPort::class.java)
    private val realtimeNodeService = RealtimeNodeService(loadIncidentPort)
    private val service = TrafficManagementService(loadIntersectionPort, loadIncidentPort, realtimeNodeService)

    @Test
    fun `should return real intersection with 2 traffic lights and 2 cameras`() {
        val result = service.getIntersections()

        assertEquals(1, result.size)
        assertEquals("INT-01", result[0].code)
        assertEquals("Av. Ejército × Av. Salaverry", result[0].name)
    }

    @Test
    fun `should calculate real telemetry metrics correctly`() {
        `when`(loadIncidentPort.findAll()).thenReturn(
            listOf(
                Incident(
                    code = "INC-1",
                    title = "Vehículo de emergencia",
                    intersectionCode = "INT-01",
                    status = "En curso",
                    reportedAt = LocalDateTime.now()
                )
            )
        )

        val telemetry = service.getTelemetry()

        assertEquals(1L, telemetry.activeNodes)
        assertEquals(1L, telemetry.openIncidents)
        assertTrue(telemetry.esp32CamStatus.contains("ESP32-CAM"))
    }

    @Test
    fun `should trigger emergency priority when ambulance is detected`() {
        val updatedCam = realtimeNodeService.updateCamDetection(
            "CAM-01",
            VehicleClassification(autos = 5, combis = 1, motos = 0, peatones = 2, unidadesEmergencia = 1)
        )

        assertTrue(updatedCam.classification.hasEmergencyVehicle)
        val node = realtimeNodeService.getNode()
        assertTrue(node.activeEmergencyPriority)
        assertEquals("SEM-01", node.activeLightId)
    }
}
