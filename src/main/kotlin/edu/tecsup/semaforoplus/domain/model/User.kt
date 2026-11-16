package edu.tecsup.semaforoplus.domain.model

import jakarta.persistence.*

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true)
    var username: String = "",

    @Column(nullable = false)
    var password: String = "",

    @Column(nullable = false)
    var fullName: String = "",

    @Column(nullable = false)
    var role: String = "ROLE_OPERATOR",

    @Column(nullable = false)
    var enabled: Boolean = true
)
