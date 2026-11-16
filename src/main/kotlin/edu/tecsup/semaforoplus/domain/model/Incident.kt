package edu.tecsup.semaforoplus.domain.model

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "incidents")
class Incident(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false)
    var code: String = "",

    @Column(nullable = false)
    var title: String = "",

    @Column(nullable = false)
    var intersectionCode: String = "",

    @Column(nullable = false)
    var severity: String = "Media", // Baja, Media, Alta, Crítica

    @Column(nullable = false)
    var status: String = "Abierta", // Abierta, En curso, Resuelta

    @Column(length = 1000)
    var description: String = "",

    @Column(nullable = false)
    var reportedAt: LocalDateTime = LocalDateTime.now()
)
