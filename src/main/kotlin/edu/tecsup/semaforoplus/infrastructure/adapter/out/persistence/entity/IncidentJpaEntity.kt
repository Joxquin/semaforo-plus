package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "incidents")
class IncidentJpaEntity(
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
    var severity: String = "Media",

    @Column(nullable = false)
    var status: String = "Abierta",

    @Column(length = 1000)
    var description: String = "",

    @Column(nullable = false)
    var reportedAt: LocalDateTime = LocalDateTime.now()
)
