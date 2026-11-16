package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.adapter

import edu.tecsup.semaforoplus.application.port.out.LoadUserPort
import edu.tecsup.semaforoplus.domain.model.User
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.mapper.UserPersistenceMapper
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.repository.SpringDataUserRepository
import org.springframework.stereotype.Component

@Component
class UserPersistenceAdapter(
    private val repository: SpringDataUserRepository,
    private val mapper: UserPersistenceMapper
) : LoadUserPort {

    override fun findByUsername(username: String): User? {
        return repository.findByUsername(username)
            .map { mapper.toDomain(it) }
            .orElse(null)
    }

    override fun save(user: User): User {
        val entity = mapper.toEntity(user)
        val saved = repository.save(entity)
        return mapper.toDomain(saved)
    }

    override fun saveAll(users: List<User>): List<User> {
        val entities = users.map { mapper.toEntity(it) }
        val saved = repository.saveAll(entities)
        return saved.map { mapper.toDomain(it) }
    }

    override fun count(): Long {
        return repository.count()
    }
}
