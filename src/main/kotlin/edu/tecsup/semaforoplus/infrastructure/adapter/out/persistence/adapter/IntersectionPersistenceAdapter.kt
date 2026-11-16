package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.adapter

import edu.tecsup.semaforoplus.application.port.out.LoadIntersectionPort
import edu.tecsup.semaforoplus.domain.model.Intersection
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.mapper.IntersectionPersistenceMapper
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.repository.SpringDataIntersectionRepository
import org.springframework.stereotype.Component

@Component
class IntersectionPersistenceAdapter(
    private val repository: SpringDataIntersectionRepository,
    private val mapper: IntersectionPersistenceMapper
) : LoadIntersectionPort {

    override fun findAll(): List<Intersection> {
        return repository.findAll().map { mapper.toDomain(it) }
    }

    override fun findByCode(code: String): Intersection? {
        return repository.findByCode(code)
            .map { mapper.toDomain(it) }
            .orElse(null)
    }

    override fun findByZone(zone: String): List<Intersection> {
        return repository.findByZone(zone).map { mapper.toDomain(it) }
    }

    override fun saveAll(intersections: List<Intersection>): List<Intersection> {
        val entities = intersections.map { mapper.toEntity(it) }
        val saved = repository.saveAll(entities)
        return saved.map { mapper.toDomain(it) }
    }

    override fun count(): Long {
        return repository.count()
    }
}
