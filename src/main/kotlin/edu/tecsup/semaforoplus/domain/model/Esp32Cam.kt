package edu.tecsup.semaforoplus.domain.model

data class VehicleClassification(
    val autos: Int = 0,
    val combis: Int = 0,
    val motos: Int = 0,
    val peatones: Int = 0,
    val unidadesEmergencia: Int = 0
) {
    val totalVehicles: Int
        get() = autos + combis + motos + unidadesEmergencia

    val weightedTrafficLoad: Double
        get() = (autos * 1.0) + (combis * 1.8) + (motos * 0.5) + (unidadesEmergencia * 100.0)

    val hasEmergencyVehicle: Boolean
        get() = unidadesEmergencia > 0
}

data class Esp32Cam(
    val id: String, // CAM-01, CAM-02
    val name: String,
    val poleLocation: String,
    val carrilObserved: String,
    val ipAddress: String,
    val status: String = "DESCONECTADA (Sin señal)", // TRANSMITIENDO_ML, EN_LINEA, DESCONECTADA (Sin señal)
    val resolution: String = "1024x768 (XGA)",
    val fps: Int = 0,
    val inferenceLatencyMs: Int = 0,
    val confidenceScore: Double = 0.0,
    val classification: VehicleClassification = VehicleClassification(),
    val isOnline: Boolean = false
)
