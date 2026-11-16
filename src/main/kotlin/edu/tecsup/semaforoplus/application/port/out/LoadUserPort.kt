package edu.tecsup.semaforoplus.application.port.out

import edu.tecsup.semaforoplus.domain.model.User

interface LoadUserPort {
    fun findByUsername(username: String): User?
    fun save(user: User): User
    fun saveAll(users: List<User>): List<User>
    fun count(): Long
}
