package edu.tecsup.semaforoplus.application.port.out

import edu.tecsup.semaforoplus.domain.model.Intersection

interface LoadIntersectionPort {
    fun findAll(): List<Intersection>
    fun findByCode(code: String): Intersection?
    fun findByZone(zone: String): List<Intersection>
    fun saveAll(intersections: List<Intersection>): List<Intersection>
    fun count(): Long
}
