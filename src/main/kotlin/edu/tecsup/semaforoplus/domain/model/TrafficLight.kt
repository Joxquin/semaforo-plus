package edu.tecsup.semaforoplus.domain.model

enum class LightState {
    GREEN, YELLOW, RED
}

enum class PedestrianState {
    WALK, DONT_WALK
}

data class TrafficLight(
    val id: String, // SEM-01, SEM-02
    val name: String,
    val carril: String,
    val direction: String,
    val state: LightState = LightState.RED,
    val greenSecondsAllocated: Int = 30,
    val remainingSeconds: Int = 0,
    val assignedCamId: String,
    val pedestrianSignal: PedestrianState = PedestrianState.DONT_WALK
)
