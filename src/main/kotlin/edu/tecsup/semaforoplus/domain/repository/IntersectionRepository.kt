package edu.tecsup.semaforoplus.domain.repository

import edu.tecsup.semaforoplus.domain.model.Intersection
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface IntersectionRepository : JpaRepository<Intersection, Long> {
    fun findByCode(code: String): Optional<Intersection>
    fun findByZone(zone: String): List<Intersection>
}
