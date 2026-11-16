package edu.tecsup.semaforoplus.domain.model

data class SolarBackup(
    val batteryPercent: Int = 0,
    val batteryVoltage: Double = 0.0,
    val solarPanelWatts: Double = 0.0,
    val powerSource: String = "Sin telemetría de hardware", // HÍBRIDO (Solar + Red), SOLO_BATERIA_SOLAR, RED_ELECTRICA, Sin telemetría de hardware
    val estimatedAutonomyHours: Double = 0.0,
    val isCharging: Boolean = false
)

data class SafetyLimits(
    val minGreenSeconds: Int = 15,
    val maxGreenSeconds: Int = 60,
    val yellowSeconds: Int = 3,
    val allRedSeconds: Int = 2,
    val pedestrianClearanceSeconds: Int = 10
)
