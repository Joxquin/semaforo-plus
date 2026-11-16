package edu.tecsup.semaforoplus.domain.model

import java.time.LocalDateTime

data class TrafficNode(
    val code: String = "NODE-01",
    val name: String = "Av. Ejército × Calle Los Arces",
    val zone: String = "Yanahuara / Cayma (Arequipa)",
    val esp32CentralIp: String = "192.168.1.50",
    val esp32CentralStatus: String = "AUTÓNOMO_LOCAL_ACTIVO",
    val firmwareVersion: String = "v2.4.1-retrofit-tecsup",
    val localProcessing: Boolean = true, // 100% local processing, immune to internet outage
    val internetConnected: Boolean = true,
    val activeEmergencyPriority: Boolean = false,
    val activeLightId: String = "SEM-01",
    val trafficLights: List<TrafficLight> = emptyList(),
    val cameras: List<Esp32Cam> = emptyList(),
    val solarBackup: SolarBackup = SolarBackup(),
    val safetyLimits: SafetyLimits = SafetyLimits(),
    val lastDecisionTime: LocalDateTime = LocalDateTime.now()
)
