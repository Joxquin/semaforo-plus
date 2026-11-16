package edu.tecsup.semaforoplus.application.port.`in`

import edu.tecsup.semaforoplus.domain.model.ProjectInfo

interface GetProjectInfoUseCase {
    fun getProjectInfo(): ProjectInfo
}
