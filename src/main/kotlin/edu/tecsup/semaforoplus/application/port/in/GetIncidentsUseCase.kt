package edu.tecsup.semaforoplus.application.port.`in`

import edu.tecsup.semaforoplus.domain.model.Incident

interface GetIncidentsUseCase {
    fun getIncidents(): List<Incident>
}
