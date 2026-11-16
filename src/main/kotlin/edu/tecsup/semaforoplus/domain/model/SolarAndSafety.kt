package edu.tecsup.semaforoplus.domain.model

data class SolarBackup(
    val batteryPercent: Int = 96,
    val batteryVoltage: Double = 13.6,
    val solarPanelWatts: Double = 45.0,
    val powerSource: String = "HÍBRIDO (Solar + Red)", // HÍBRIDO (Solar + Red), SOLO_BATERIA_SOLAR, RED_ELECTRICA
    val estimatedAutonomyHours: Double = 18.5,
    val isCharging: Boolean = true
)

data class SafetyLimits(
    val minGreenSeconds: Int = 15,
    val maxGreenSeconds: Int = 60,
    val yellowSeconds: Int = 3,
    val allRedSeconds: Int = 2,
    val pedestrianClearanceSeconds: Int = 10
)
