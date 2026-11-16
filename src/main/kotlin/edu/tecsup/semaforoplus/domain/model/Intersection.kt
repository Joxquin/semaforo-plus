package edu.tecsup.semaforoplus.domain.model

data class Intersection(
    val id: Long? = 1L,
    val code: String = "INT-01",
    val name: String = "Av. Ejército × Calle Los Arces",
    val zone: String = "Yanahuara / Cayma",
    val status: String = "Operativa",
    val mode: String = "ESP32 Adaptativo (Local 100%)",
    val congestionPercent: Int = 42,
    val greenNsSeconds: Int = 38,
    val greenEwSeconds: Int = 22,
    val solarBatteryLevel: Int = 96,
    val esp32Status: String = "En línea (Autónomo)",
    val esp32CamStatus: String = "2/2 Cámaras ML Activas",
    val emergencyPriorityActive: Boolean = false
)
