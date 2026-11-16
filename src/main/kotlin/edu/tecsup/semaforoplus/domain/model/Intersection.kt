package edu.tecsup.semaforoplus.domain.model

import jakarta.persistence.*

@Entity
@Table(name = "intersections")
class Intersection(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true)
    var code: String = "",

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var zone: String = "",

    @Column(nullable = false)
    var status: String = "Operativa",

    @Column(nullable = false)
    var mode: String = "ESP32 Adaptativo",

    @Column(nullable = false)
    var congestionPercent: Int = 30,

    @Column(nullable = false)
    var greenNsSeconds: Int = 35,

    @Column(nullable = false)
    var greenEwSeconds: Int = 25,

    @Column(nullable = false)
    var solarBatteryLevel: Int = 100,

    @Column(nullable = false)
    var esp32Status: String = "En línea",

    @Column(nullable = false)
    var esp32CamStatus: String = "Transmitiendo",

    @Column(nullable = false)
    var emergencyPriorityActive: Boolean = false
)
