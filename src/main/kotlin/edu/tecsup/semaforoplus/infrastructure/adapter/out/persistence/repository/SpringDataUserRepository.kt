package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.repository

import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity.UserJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface SpringDataUserRepository : JpaRepository<UserJpaEntity, Long> {
    fun findByUsername(username: String): Optional<UserJpaEntity>
}
