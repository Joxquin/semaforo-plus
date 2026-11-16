package edu.tecsup.semaforoplus.domain.model

data class ProjectInfo(
    val project: String = "Semáforo+",
    val institution: String = "TECSUP (Arequipa)",
    val goal: String = "ODS 11: Ciudades y comunidades sostenibles",
    val methodology: String = "Design Thinking",
    val problemDiagnostic: ProblemDiagnostic = ProblemDiagnostic(),
    val architecture: SystemArchitecture = SystemArchitecture(),
    val status: String = "ONLINE"
)

data class ProblemDiagnostic(
    val citizensAffectedPercentage: Int = 69,
    val annualHoursLostPerDriver: Int = 154,
    val targetAvenue: String = "Av. Ejército"
)

data class SystemArchitecture(
    val type: String = "Retrofit adaptativo",
    val microcontroller: String = "ESP32",
    val computerVision: String = "ESP32-CAM",
    val modeling3D: String = "Tinkercad",
    val uiDesign: String = "Figma",
    val features: List<String> = listOf(
        "Ajuste dinámico de tiempo verde por demanda real",
        "Priorización de vehículos de emergencia y transporte público",
        "Respaldo energético solar y modo autónomo"
    )
)

data class Telemetry(
    val activeNodes: Long,
    val averageSolarBattery: String,
    val activeEmergencyPriorities: Int,
    val openIncidents: Long,
    val esp32CamStatus: String,
    val avgGreenTimeGainSeconds: Int
)
