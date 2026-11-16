package edu.tecsup.semaforoplus.domain.model

import java.time.LocalDateTime

data class Incident(
    val id: Long? = null,
    val code: String,
    val title: String,
    val intersectionCode: String,
    val severity: String = "Media",
    val status: String = "Abierta",
    val description: String = "",
    val reportedAt: LocalDateTime = LocalDateTime.now()
)
