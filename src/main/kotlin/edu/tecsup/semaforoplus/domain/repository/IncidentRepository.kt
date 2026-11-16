package edu.tecsup.semaforoplus.domain.repository

import edu.tecsup.semaforoplus.domain.model.Incident
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface IncidentRepository : JpaRepository<Incident, Long> {
    fun findByStatus(status: String): List<Incident>
    fun findByIntersectionCode(intersectionCode: String): List<Incident>
}
