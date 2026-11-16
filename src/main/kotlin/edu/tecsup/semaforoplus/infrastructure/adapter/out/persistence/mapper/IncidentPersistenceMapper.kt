package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.mapper

import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity.IncidentJpaEntity
import org.springframework.stereotype.Component

@Component
class IncidentPersistenceMapper {

    fun toDomain(entity: IncidentJpaEntity): Incident {
        return Incident(
            id = entity.id,
            code = entity.code,
            title = entity.title,
            intersectionCode = entity.intersectionCode,
            severity = entity.severity,
            status = entity.status,
            description = entity.description,
            reportedAt = entity.reportedAt
        )
    }

    fun toEntity(domain: Incident): IncidentJpaEntity {
        return IncidentJpaEntity(
            id = domain.id,
            code = domain.code,
            title = domain.title,
            intersectionCode = domain.intersectionCode,
            severity = domain.severity,
            status = domain.status,
            description = domain.description,
            reportedAt = domain.reportedAt
        )
    }
}
