package edu.tecsup.semaforoplus.domain.model

enum class LightState {
    GREEN, YELLOW, RED, STANDBY
}

enum class PedestrianState {
    WALK, DONT_WALK, STANDBY
}

data class TrafficLight(
    val id: String, // SEM-01, SEM-02
    val name: String,
    val carril: String,
    val direction: String,
    val state: LightState = LightState.STANDBY,
    val greenSecondsAllocated: Int = 0,
    val remainingSeconds: Int = 0,
    val assignedCamId: String,
    val pedestrianSignal: PedestrianState = PedestrianState.STANDBY,
    val isOnline: Boolean = false
)
