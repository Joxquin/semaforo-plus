package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.repository

import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity.IncidentJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface SpringDataIncidentRepository : JpaRepository<IncidentJpaEntity, Long> {
    fun findByStatus(status: String): List<IncidentJpaEntity>
    fun findByIntersectionCode(intersectionCode: String): List<IncidentJpaEntity>
}
