package edu.tecsup.semaforoplus.domain.model

data class Intersection(
    val id: Long? = null,
    val code: String,
    val name: String,
    val zone: String,
    val status: String = "Operativa",
    val mode: String = "ESP32 Adaptativo",
    val congestionPercent: Int = 30,
    val greenNsSeconds: Int = 35,
    val greenEwSeconds: Int = 25,
    val solarBatteryLevel: Int = 100,
    val esp32Status: String = "En línea",
    val esp32CamStatus: String = "Transmitiendo",
    val emergencyPriorityActive: Boolean = false
)
