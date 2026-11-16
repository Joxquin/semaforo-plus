package edu.tecsup.semaforoplus.domain.model

data class ProjectInfo(
    val project: String = "Semáforo+",
    val institution: String = "TECSUP (Arequipa)",
    val goal: String = "ODS 11: Ciudades y comunidades sostenibles",
    val methodology: String = "Design Thinking",
    val problemDiagnostic: ProblemDiagnostic = ProblemDiagnostic(),
    val architecture: SystemArchitecture = SystemArchitecture(),
    val physicalNode: PhysicalNodeSummary = PhysicalNodeSummary(),
    val status: String = "ONLINE_LOCAL_AUTONOMOUS"
)

data class ProblemDiagnostic(
    val citizensAffectedPercentage: Int = 69,
    val annualHoursLostPerDriver: Int = 154,
    val targetAvenue: String = "Av. Ejército × Calle Los Arces"
)

data class SystemArchitecture(
    val type: String = "Retrofit adaptativo 100% local",
    val microcontroller: String = "ESP32 (Cerebro Central)",
    val computerVision: String = "2× ESP32-CAM con Machine Learning On-Edge",
    val modeling3D: String = "Tinkercad",
    val uiDesign: String = "Figma",
    val features: List<String> = listOf(
        "Detección y clasificación vehicular en el lugar (Autos, Combis, Motos, Peatones, Emergencias)",
        "Toma de decisiones 100% local en ESP32 inmune a cortes de internet",
        "Límites de seguridad estrictos (15s mínimo - 60s máximo)",
        "Priorización inmediata de vehículos de emergencia (ambulancias y bomberos)",
        "Respaldo solar híbrido con baterías ante cortes de fluido eléctrico"
    )
)

data class PhysicalNodeSummary(
    val trafficLightsCount: Int = 2,
    val trafficLights: List<String> = listOf("SEM-01 (Av. Ejército)", "SEM-02 (Calle Los Arces)"),
    val camerasCount: Int = 2,
    val cameras: List<String> = listOf("CAM-01 (Poste Norte · Av. Ejército)", "CAM-02 (Poste Este · Calle Los Arces)")
)

data class Telemetry(
    val activeNodes: Long,
    val averageSolarBattery: String,
    val activeEmergencyPriorities: Int,
    val openIncidents: Long,
    val esp32CamStatus: String,
    val avgGreenTimeGainSeconds: Int
)
