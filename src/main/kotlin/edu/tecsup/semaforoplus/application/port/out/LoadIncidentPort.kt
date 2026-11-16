package edu.tecsup.semaforoplus.application.port.out

import edu.tecsup.semaforoplus.domain.model.Incident

interface LoadIncidentPort {
    fun findAll(): List<Incident>
    fun findByStatus(status: String): List<Incident>
    fun findByIntersectionCode(code: String): List<Incident>
    fun saveAll(incidents: List<Incident>): List<Incident>
    fun count(): Long
}
