package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.mapper

import edu.tecsup.semaforoplus.domain.model.User
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity.UserJpaEntity
import org.springframework.stereotype.Component

@Component
class UserPersistenceMapper {

    fun toDomain(entity: UserJpaEntity): User {
        return User(
            id = entity.id,
            username = entity.username,
            password = entity.password,
            fullName = entity.fullName,
            role = entity.role,
            enabled = entity.enabled
        )
    }

    fun toEntity(domain: User): UserJpaEntity {
        return UserJpaEntity(
            id = domain.id,
            username = domain.username,
            password = domain.password,
            fullName = domain.fullName,
            role = domain.role,
            enabled = domain.enabled
        )
    }
}
