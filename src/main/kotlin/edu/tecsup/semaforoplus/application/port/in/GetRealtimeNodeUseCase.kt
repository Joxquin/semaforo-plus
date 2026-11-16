package edu.tecsup.semaforoplus.application.port.`in`

import edu.tecsup.semaforoplus.domain.model.Esp32Cam
import edu.tecsup.semaforoplus.domain.model.TrafficLight
import edu.tecsup.semaforoplus.domain.model.TrafficNode
import edu.tecsup.semaforoplus.domain.model.VehicleClassification

interface GetRealtimeNodeUseCase {
    fun getNode(): TrafficNode
    fun getCameras(): List<Esp32Cam>
    fun getTrafficLights(): List<TrafficLight>
    fun triggerEmergencyPriority(camId: String): TrafficNode
    fun resetEmergencyPriority(): TrafficNode
    fun updateCamDetection(camId: String, classification: VehicleClassification): Esp32Cam
    fun updateCamDetection(camId: String, classification: VehicleClassification, latencyMs: Int, fps: Int): Esp32Cam
    fun updateSolarTelemetry(batteryPercent: Int, voltage: Double, powerSource: String): TrafficNode
    fun updateEsp32Telemetry(
        sem1State: String,
        sem2State: String,
        remainingSec: Int,
        sem1Allocated: Int,
        sem2Allocated: Int,
        batteryVoltage: Double,
        batteryPercent: Int,
        powerSource: String,
        emergencyActive: Boolean
    ): TrafficNode
}
