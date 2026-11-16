package edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.mapper

import edu.tecsup.semaforoplus.domain.model.Intersection
import edu.tecsup.semaforoplus.infrastructure.adapter.out.persistence.entity.IntersectionJpaEntity
import org.springframework.stereotype.Component

@Component
class IntersectionPersistenceMapper {

    fun toDomain(entity: IntersectionJpaEntity): Intersection {
        return Intersection(
            id = entity.id,
            code = entity.code,
            name = entity.name,
            zone = entity.zone,
            status = entity.status,
            mode = entity.mode,
            congestionPercent = entity.congestionPercent,
            greenNsSeconds = entity.greenNsSeconds,
            greenEwSeconds = entity.greenEwSeconds,
            solarBatteryLevel = entity.solarBatteryLevel,
            esp32Status = entity.esp32Status,
            esp32CamStatus = entity.esp32CamStatus,
            emergencyPriorityActive = entity.emergencyPriorityActive
        )
    }

    fun toEntity(domain: Intersection): IntersectionJpaEntity {
        return IntersectionJpaEntity(
            id = domain.id,
            code = domain.code,
            name = domain.name,
            zone = domain.zone,
            status = domain.status,
            mode = domain.mode,
            congestionPercent = domain.congestionPercent,
            greenNsSeconds = domain.greenNsSeconds,
            greenEwSeconds = domain.greenEwSeconds,
            solarBatteryLevel = domain.solarBatteryLevel,
            esp32Status = domain.esp32Status,
            esp32CamStatus = domain.esp32CamStatus,
            emergencyPriorityActive = domain.emergencyPriorityActive
        )
    }
}
