package edu.tecsup.semaforoplus.application.port.`in`

import edu.tecsup.semaforoplus.domain.model.Telemetry

interface GetTelemetryUseCase {
    fun getTelemetry(): Telemetry
}
