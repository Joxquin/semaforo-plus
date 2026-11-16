package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.adapter

import edu.tecsup.semaforoplus.application.port.out.LoadIncidentPort
import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.mapper.IncidentPersistenceMapper
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.repository.SpringDataIncidentRepository
import org.springframework.stereotype.Component

@Component
class IncidentPersistenceAdapter(
    private val repository: SpringDataIncidentRepository,
    private val mapper: IncidentPersistenceMapper
) : LoadIncidentPort {

    override fun findAll(): List<Incident> {
        return repository.findAll().map { mapper.toDomain(it) }
    }

    override fun findByStatus(status: String): List<Incident> {
        return repository.findByStatus(status).map { mapper.toDomain(it) }
    }

    override fun findByIntersectionCode(code: String): List<Incident> {
        return repository.findByIntersectionCode(code).map { mapper.toDomain(it) }
    }

    override fun saveAll(incidents: List<Incident>): List<Incident> {
        val entities = incidents.map { mapper.toEntity(it) }
        val saved = repository.saveAll(entities)
        return saved.map { mapper.toDomain(it) }
    }

    override fun count(): Long {
        return repository.count()
    }
}
