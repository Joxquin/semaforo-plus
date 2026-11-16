package edu.tecsup.semaforoplus.application.service

import edu.tecsup.semaforoplus.application.port.`in`.GetRealtimeNodeUseCase
import edu.tecsup.semaforoplus.application.port.out.LoadIncidentPort
import edu.tecsup.semaforoplus.domain.model.*
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

@Service
class RealtimeNodeService(
    private val loadIncidentPort: LoadIncidentPort
) : GetRealtimeNodeUseCase {

    private val HEARTBEAT_TIMEOUT_SECONDS = 35L

    private val safetyLimits = SafetyLimits(
        minGreenSeconds = 15,
        maxGreenSeconds = 60,
        yellowSeconds = 3,
        allRedSeconds = 2,
        pedestrianClearanceSeconds = 10
    )

    // Hardware heartbeats (null by default = not connected)
    private val lastEsp32Heartbeat = AtomicReference<Instant?>(null)
    private val lastCam1Heartbeat = AtomicReference<Instant?>(null)
    private val lastCam2Heartbeat = AtomicReference<Instant?>(null)

    // Camera states
    private val cam1Data = AtomicReference(
        Esp32Cam(
            id = "CAM-01",
            name = "ESP32-CAM 01 · Poste Norte",
            poleLocation = "Poste Norte · Av. Ejército (Carril N–S)",
            carrilObserved = "Av. Ejército",
            ipAddress = "192.168.1.51",
            status = "DESCONECTADA (Sin señal)",
            resolution = "1024x768 (XGA)",
            fps = 0,
            inferenceLatencyMs = 0,
            confidenceScore = 0.0,
            classification = VehicleClassification(),
            isOnline = false
        )
    )

    private val cam2Data = AtomicReference(
        Esp32Cam(
            id = "CAM-02",
            name = "ESP32-CAM 02 · Poste Este",
            poleLocation = "Poste Este · Calle Los Arces (Carril E–O)",
            carrilObserved = "Calle Los Arces",
            ipAddress = "192.168.1.52",
            status = "DESCONECTADA (Sin señal)",
            resolution = "1024x768 (XGA)",
            fps = 0,
            inferenceLatencyMs = 0,
            confidenceScore = 0.0,
            classification = VehicleClassification(),
            isOnline = false
        )
    )

    // Solar state
    private val solarData = AtomicReference(
        SolarBackup(
            batteryPercent = 0,
            batteryVoltage = 0.0,
            solarPanelWatts = 0.0,
            powerSource = "Sin telemetría de hardware",
            estimatedAutonomyHours = 0.0,
            isCharging = false
        )
    )

    // Traffic light state received from central ESP32
    private var sem1State: LightState = LightState.STANDBY
    private var sem2State: LightState = LightState.STANDBY
    private var semRemainingSec: Int = 0
    private var sem1AllocSec: Int = 0
    private var sem2AllocSec: Int = 0
    private var emergencyPriorityActive: Boolean = false

    private fun isEsp32Online(): Boolean {
        val hb = lastEsp32Heartbeat.get() ?: return false
        return Duration.between(hb, Instant.now()).seconds <= HEARTBEAT_TIMEOUT_SECONDS
    }

    private fun isCam1Online(): Boolean {
        val hb = lastCam1Heartbeat.get() ?: return false
        return Duration.between(hb, Instant.now()).seconds <= HEARTBEAT_TIMEOUT_SECONDS
    }

    private fun isCam2Online(): Boolean {
        val hb = lastCam2Heartbeat.get() ?: return false
        return Duration.between(hb, Instant.now()).seconds <= HEARTBEAT_TIMEOUT_SECONDS
    }

    private fun isAnyIotOnline(): Boolean = isEsp32Online() || isCam1Online() || isCam2Online()

    override fun getNode(): TrafficNode {
        val esp32Online = isEsp32Online()
        val cam1Online = isCam1Online()
        val cam2Online = isCam2Online()
        val anyOnline = esp32Online || cam1Online || cam2Online

        val c1 = cam1Data.get().let {
            if (cam1Online) it.copy(isOnline = true, status = "TRANSMITIENDO_ML")
            else it.copy(isOnline = false, status = "DESCONECTADA (Sin señal)", fps = 0, inferenceLatencyMs = 0, classification = VehicleClassification())
        }
        val c2 = cam2Data.get().let {
            if (cam2Online) it.copy(isOnline = true, status = "TRANSMITIENDO_ML")
            else it.copy(isOnline = false, status = "DESCONECTADA (Sin señal)", fps = 0, inferenceLatencyMs = 0, classification = VehicleClassification())
        }

        val solar = if (esp32Online) {
            solarData.get()
        } else {
            SolarBackup(
                batteryPercent = 0,
                batteryVoltage = 0.0,
                solarPanelWatts = 0.0,
                powerSource = "Sin telemetría de hardware",
                estimatedAutonomyHours = 0.0,
                isCharging = false
            )
        }

        val lights = if (esp32Online) {
            listOf(
                TrafficLight(
                    id = "SEM-01",
                    name = "Semáforo Principal (Av. Ejército)",
                    carril = "Av. Ejército (N–S)",
                    direction = "Norte a Sur",
                    state = sem1State,
                    greenSecondsAllocated = sem1AllocSec,
                    remainingSeconds = if (sem1State == LightState.GREEN) semRemainingSec else 0,
                    assignedCamId = "CAM-01",
                    pedestrianSignal = if (sem1State == LightState.GREEN) PedestrianState.DONT_WALK else PedestrianState.WALK,
                    isOnline = true
                ),
                TrafficLight(
                    id = "SEM-02",
                    name = "Semáforo Secundario (Calle Los Arces)",
                    carril = "Calle Los Arces (E–O)",
                    direction = "Este a Oeste",
                    state = sem2State,
                    greenSecondsAllocated = sem2AllocSec,
                    remainingSeconds = if (sem2State == LightState.GREEN) semRemainingSec else 0,
                    assignedCamId = "CAM-02",
                    pedestrianSignal = if (sem2State == LightState.GREEN) PedestrianState.DONT_WALK else PedestrianState.WALK,
                    isOnline = true
                )
            )
        } else {
            // Disconnected fallback: STANDBY with no fake numbers
            listOf(
                TrafficLight(
                    id = "SEM-01",
                    name = "Semáforo Principal (Av. Ejército)",
                    carril = "Av. Ejército (N–S)",
                    direction = "Norte a Sur",
                    state = LightState.STANDBY,
                    greenSecondsAllocated = 0,
                    remainingSeconds = 0,
                    assignedCamId = "CAM-01",
                    pedestrianSignal = PedestrianState.STANDBY,
                    isOnline = false
                ),
                TrafficLight(
                    id = "SEM-02",
                    name = "Semáforo Secundario (Calle Los Arces)",
                    carril = "Calle Los Arces (E–O)",
                    direction = "Este a Oeste",
                    state = LightState.STANDBY,
                    greenSecondsAllocated = 0,
                    remainingSeconds = 0,
                    assignedCamId = "CAM-02",
                    pedestrianSignal = PedestrianState.STANDBY,
                    isOnline = false
                )
            )
        }

        val centralStatus = when {
            !esp32Online -> "DESCONECTADO"
            emergencyPriorityActive -> "ONDA_VERDE_EMERGENCIA_ACTIVA"
            else -> "AUTÓNOMO_LOCAL_ACTIVO"
        }

        val offlineMsg = if (!anyOnline) {
            "Dispositivos IoT no conectados: No se detecta enlace activo con el microcontrolador central ESP32 ni con las cámaras ESP32-CAM. Mostrando estado sin señal (sin datos simulados). Carga el firmware de /firmware en tus microcontroladores para iniciar la transmisión real."
        } else null

        return TrafficNode(
            code = "NODE-01",
            name = "Av. Ejército × Av. Salaverry",
            zone = "Yanahuara",
            esp32CentralIp = "192.168.1.50",
            esp32CentralStatus = centralStatus,
            firmwareVersion = "v2.4.1-retrofit-tecsup",
            localProcessing = true,
            internetConnected = true,
            iotConnected = anyOnline,
            offlineMessage = offlineMsg,
            activeEmergencyPriority = emergencyPriorityActive,
            activeLightId = if (sem2State == LightState.GREEN) "SEM-02" else "SEM-01",
            trafficLights = lights,
            cameras = listOf(c1, c2),
            solarBackup = solar,
            safetyLimits = safetyLimits,
            lastDecisionTime = LocalDateTime.now()
        )
    }

    override fun getCameras(): List<Esp32Cam> {
        val n = getNode()
        return n.cameras
    }

    override fun getTrafficLights(): List<TrafficLight> {
        return getNode().trafficLights
    }

    override fun triggerEmergencyPriority(camId: String): TrafficNode {
        emergencyPriorityActive = true
        sem1State = if (camId == "CAM-02") LightState.RED else LightState.GREEN
        sem2State = if (camId == "CAM-02") LightState.GREEN else LightState.RED
        semRemainingSec = 45

        // Save event
        loadIncidentPort.saveAll(
            listOf(
                Incident(
                    code = "EMERG-${System.currentTimeMillis() % 10000}",
                    title = "Vehículo de emergencia en $camId",
                    intersectionCode = "INT-01",
                    severity = "Crítica",
                    status = "En curso",
                    description = "Prioridad activada en cruce Av. Ejército × Calle Los Arces.",
                    reportedAt = LocalDateTime.now()
                )
            )
        )

        return getNode()
    }

    override fun resetEmergencyPriority(): TrafficNode {
        emergencyPriorityActive = false
        return getNode()
    }

    override fun updateCamDetection(camId: String, classification: VehicleClassification): Esp32Cam {
        return updateCamDetection(camId, classification, 140, 20)
    }

    override fun updateCamDetection(
        camId: String,
        classification: VehicleClassification,
        latencyMs: Int,
        fps: Int
    ): Esp32Cam {
        val now = Instant.now()
        val isCam2 = (camId == "CAM-02" || camId == "cam2")
        val targetRef = if (isCam2) cam2Data else cam1Data
        if (isCam2) lastCam2Heartbeat.set(now) else lastCam1Heartbeat.set(now)

        val updated = targetRef.get().copy(
            classification = classification,
            status = "TRANSMITIENDO_ML",
            isOnline = true,
            fps = fps,
            inferenceLatencyMs = latencyMs,
            confidenceScore = 95.5
        )
        targetRef.set(updated)

        if (classification.hasEmergencyVehicle) {
            triggerEmergencyPriority(if (isCam2) "CAM-02" else "CAM-01")
        }

        return updated
    }

    override fun updateSolarTelemetry(batteryPercent: Int, voltage: Double, powerSource: String): TrafficNode {
        lastEsp32Heartbeat.set(Instant.now())
        solarData.set(
            SolarBackup(
                batteryPercent = batteryPercent,
                batteryVoltage = voltage,
                solarPanelWatts = if (batteryPercent > 50) 48.5 else 20.0,
                powerSource = powerSource,
                estimatedAutonomyHours = (batteryPercent / 100.0) * 20.0,
                isCharging = voltage >= 13.0
            )
        )
        return getNode()
    }

    override fun updateEsp32Telemetry(
        sem1State: String,
        sem2State: String,
        remainingSec: Int,
        sem1Allocated: Int,
        sem2Allocated: Int,
        batteryVoltage: Double,
        batteryPercent: Int,
        powerSource: String,
        emergencyActive: Boolean
    ): TrafficNode {
        lastEsp32Heartbeat.set(Instant.now())
        this.sem1State = try { LightState.valueOf(sem1State.uppercase()) } catch (e: Exception) { LightState.GREEN }
        this.sem2State = try { LightState.valueOf(sem2State.uppercase()) } catch (e: Exception) { LightState.RED }
        this.semRemainingSec = remainingSec
        this.sem1AllocSec = sem1Allocated
        this.sem2AllocSec = sem2Allocated
        this.emergencyPriorityActive = emergencyActive

        solarData.set(
            SolarBackup(
                batteryPercent = batteryPercent,
                batteryVoltage = batteryVoltage,
                solarPanelWatts = if (batteryPercent > 50) 48.5 else 15.0,
                powerSource = powerSource,
                estimatedAutonomyHours = (batteryPercent / 100.0) * 20.0,
                isCharging = batteryVoltage >= 13.0
            )
        )

        return getNode()
    }
}
