package edu.tecsup.semaforoplus.application.port.`in`

import edu.tecsup.semaforoplus.domain.model.Intersection

interface GetIntersectionsUseCase {
    fun getIntersections(): List<Intersection>
}
