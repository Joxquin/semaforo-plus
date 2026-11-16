package edu.tecsup.semaforoplus.domain.model

data class User(
    val id: Long? = null,
    val username: String,
    val password: String,
    val fullName: String,
    val role: String = "ROLE_OPERATOR",
    val enabled: Boolean = true
)
