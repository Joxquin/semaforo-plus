package edu.tecsup.semaforoplus.application.service

import edu.tecsup.semaforoplus.application.port.`in`.GetRealtimeNodeUseCase
import edu.tecsup.semaforoplus.application.port.out.LoadIncidentPort
import edu.tecsup.semaforoplus.domain.model.*
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

@Service
class RealtimeNodeService(
    private val loadIncidentPort: LoadIncidentPort
) : GetRealtimeNodeUseCase {

    private val safetyLimits = SafetyLimits(
        minGreenSeconds = 15,
        maxGreenSeconds = 60,
        yellowSeconds = 3,
        allRedSeconds = 2,
        pedestrianClearanceSeconds = 10
    )

    private val cam1 = AtomicReference(
        Esp32Cam(
            id = "CAM-01",
            name = "ESP32-CAM 01 · Poste Norte",
            poleLocation = "Poste Norte · Av. Ejército (Carril N–S)",
            carrilObserved = "Av. Ejército",
            ipAddress = "192.168.1.51",
            status = "TRANSMITIENDO_ML",
            resolution = "1024x768 (XGA)",
            fps = 20,
            inferenceLatencyMs = 142,
            confidenceScore = 95.4,
            classification = VehicleClassification(
                autos = 11,
                combis = 3,
                motos = 2,
                peatones = 4,
                unidadesEmergencia = 0
            )
        )
    )

    private val cam2 = AtomicReference(
        Esp32Cam(
            id = "CAM-02",
            name = "ESP32-CAM 02 · Poste Este",
            poleLocation = "Poste Este · Calle Los Arces (Carril E–O)",
            carrilObserved = "Calle Los Arces",
            ipAddress = "192.168.1.52",
            status = "TRANSMITIENDO_ML",
            resolution = "1024x768 (XGA)",
            fps = 20,
            inferenceLatencyMs = 155,
            confidenceScore = 94.1,
            classification = VehicleClassification(
                autos = 5,
                combis = 1,
                motos = 2,
                peatones = 3,
                unidadesEmergencia = 0
            )
        )
    )

    private val solarBackup = AtomicReference(
        SolarBackup(
            batteryPercent = 96,
            batteryVoltage = 13.6,
            solarPanelWatts = 48.5,
            powerSource = "HÍBRIDO (Solar + Red)",
            estimatedAutonomyHours = 18.5,
            isCharging = true
        )
    )

    private var activeLightId: String = "SEM-01"
    private var emergencyPriorityActive: Boolean = false

    override fun getNode(): TrafficNode {
        val c1 = cam1.get()
        val c2 = cam2.get()
        val solar = solarBackup.get()

        val allocatedTimes = calculateAdaptiveTimes(c1.classification, c2.classification)

        val lights = if (emergencyPriorityActive) {
            listOf(
                TrafficLight(
                    id = "SEM-01",
                    name = "Semáforo Principal (Av. Ejército)",
                    carril = "Av. Ejército (N–S)",
                    direction = "Norte a Sur",
                    state = if (activeLightId == "SEM-01") LightState.GREEN else LightState.RED,
                    greenSecondsAllocated = 45,
                    remainingSeconds = 35,
                    assignedCamId = "CAM-01",
                    pedestrianSignal = if (activeLightId == "SEM-01") PedestrianState.DONT_WALK else PedestrianState.WALK
                ),
                TrafficLight(
                    id = "SEM-02",
                    name = "Semáforo Secundario (Calle Los Arces)",
                    carril = "Calle Los Arces (E–O)",
                    direction = "Este a Oeste",
                    state = if (activeLightId == "SEM-02") LightState.GREEN else LightState.RED,
                    greenSecondsAllocated = 45,
                    remainingSeconds = 35,
                    assignedCamId = "CAM-02",
                    pedestrianSignal = if (activeLightId == "SEM-02") PedestrianState.DONT_WALK else PedestrianState.WALK
                )
            )
        } else {
            listOf(
                TrafficLight(
                    id = "SEM-01",
                    name = "Semáforo Principal (Av. Ejército)",
                    carril = "Av. Ejército (N–S)",
                    direction = "Norte a Sur",
                    state = if (activeLightId == "SEM-01") LightState.GREEN else LightState.RED,
                    greenSecondsAllocated = allocatedTimes.first,
                    remainingSeconds = if (activeLightId == "SEM-01") 24 else 0,
                    assignedCamId = "CAM-01",
                    pedestrianSignal = if (activeLightId == "SEM-01") PedestrianState.DONT_WALK else PedestrianState.WALK
                ),
                TrafficLight(
                    id = "SEM-02",
                    name = "Semáforo Secundario (Calle Los Arces)",
                    carril = "Calle Los Arces (E–O)",
                    direction = "Este a Oeste",
                    state = if (activeLightId == "SEM-02") LightState.GREEN else LightState.RED,
                    greenSecondsAllocated = allocatedTimes.second,
                    remainingSeconds = if (activeLightId == "SEM-02") 18 else 0,
                    assignedCamId = "CAM-02",
                    pedestrianSignal = if (activeLightId == "SEM-02") PedestrianState.DONT_WALK else PedestrianState.WALK
                )
            )
        }

        return TrafficNode(
            code = "NODE-01",
            name = "Av. Ejército × Calle Los Arces",
            zone = "Yanahuara / Cayma (Arequipa)",
            esp32CentralIp = "192.168.1.50",
            esp32CentralStatus = if (emergencyPriorityActive) "ONDA_VERDE_EMERGENCIA_ACTIVA" else "AUTÓNOMO_LOCAL_ACTIVO",
            firmwareVersion = "v2.4.1-retrofit-tecsup",
            localProcessing = true,
            internetConnected = true,
            activeEmergencyPriority = emergencyPriorityActive,
            activeLightId = activeLightId,
            trafficLights = lights,
            cameras = listOf(c1, c2),
            solarBackup = solar,
            safetyLimits = safetyLimits,
            lastDecisionTime = LocalDateTime.now()
        )
    }

    override fun getCameras(): List<Esp32Cam> {
        return listOf(cam1.get(), cam2.get())
    }

    override fun getTrafficLights(): List<TrafficLight> {
        return getNode().trafficLights
    }

    override fun triggerEmergencyPriority(camId: String): TrafficNode {
        emergencyPriorityActive = true
        activeLightId = if (camId == "CAM-02") "SEM-02" else "SEM-01"

        // Update emergency classification in the corresponding camera
        if (camId == "CAM-02") {
            val curr = cam2.get()
            cam2.set(curr.copy(classification = curr.classification.copy(unidadesEmergencia = 1)))
        } else {
            val curr = cam1.get()
            cam1.set(curr.copy(classification = curr.classification.copy(unidadesEmergencia = 1)))
        }

        // Register incident
        loadIncidentPort.saveAll(
            listOf(
                Incident(
                    code = "EMERG-${System.currentTimeMillis() % 10000}",
                    title = "Vehículo de emergencia detectado en $camId",
                    intersectionCode = "INT-01",
                    severity = "Crítica",
                    status = "En curso",
                    description = "ESP32 conmutó de forma autónoma e inmediata a onda verde prioritaria para dar paso a ambulancia/bomberos.",
                    reportedAt = LocalDateTime.now()
                )
            )
        )

        return getNode()
    }

    override fun resetEmergencyPriority(): TrafficNode {
        emergencyPriorityActive = false
        activeLightId = "SEM-01"
        val c1 = cam1.get()
        val c2 = cam2.get()
        cam1.set(c1.copy(classification = c1.classification.copy(unidadesEmergencia = 0)))
        cam2.set(c2.copy(classification = c2.classification.copy(unidadesEmergencia = 0)))
        return getNode()
    }

    override fun updateCamDetection(camId: String, classification: VehicleClassification): Esp32Cam {
        return if (camId == "CAM-02") {
            val updated = cam2.get().copy(
                classification = classification,
                status = "TRANSMITIENDO_ML",
                confidenceScore = 95.0
            )
            cam2.set(updated)
            if (classification.hasEmergencyVehicle) {
                triggerEmergencyPriority("CAM-02")
            }
            updated
        } else {
            val updated = cam1.get().copy(
                classification = classification,
                status = "TRANSMITIENDO_ML",
                confidenceScore = 96.2
            )
            cam1.set(updated)
            if (classification.hasEmergencyVehicle) {
                triggerEmergencyPriority("CAM-01")
            }
            updated
        }
    }

    override fun updateSolarTelemetry(batteryPercent: Int, voltage: Double, powerSource: String): TrafficNode {
        val curr = solarBackup.get()
        solarBackup.set(
            curr.copy(
                batteryPercent = batteryPercent,
                batteryVoltage = voltage,
                powerSource = powerSource,
                estimatedAutonomyHours = (batteryPercent / 100.0) * 20.0
            )
        )
        return getNode()
    }

    private fun calculateAdaptiveTimes(v1: VehicleClassification, v2: VehicleClassification): Pair<Int, Int> {
        val w1 = max(1.0, v1.weightedTrafficLoad)
        val w2 = max(1.0, v2.weightedTrafficLoad)
        val total = w1 + w2

        // Total cycle budget for greens
        val totalBudget = 60

        val raw1 = (totalBudget * (w1 / total)).roundToInt()
        val raw2 = (totalBudget * (w2 / total)).roundToInt()

        // Apply strict safety bounds: 15s min, 60s max
        val t1 = min(safetyLimits.maxGreenSeconds, max(safetyLimits.minGreenSeconds, raw1))
        val t2 = min(safetyLimits.maxGreenSeconds, max(safetyLimits.minGreenSeconds, raw2))

        return Pair(t1, t2)
    }
}
