package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.repository

import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity.IntersectionJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface SpringDataIntersectionRepository : JpaRepository<IntersectionJpaEntity, Long> {
    fun findByCode(code: String): Optional<IntersectionJpaEntity>
    fun findByZone(zone: String): List<IntersectionJpaEntity>
}
