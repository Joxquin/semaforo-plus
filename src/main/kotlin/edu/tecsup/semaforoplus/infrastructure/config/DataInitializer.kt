package edu.tecsup.semaforoplus.infrastructure.config

import edu.tecsup.semaforoplus.application.port.out.LoadIncidentPort
import edu.tecsup.semaforoplus.application.port.out.LoadIntersectionPort
import edu.tecsup.semaforoplus.application.port.out.LoadUserPort
import edu.tecsup.semaforoplus.domain.model.Incident
import edu.tecsup.semaforoplus.domain.model.Intersection
import edu.tecsup.semaforoplus.domain.model.User
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import java.time.LocalDateTime

@Component
class DataInitializer(
    private val loadUserPort: LoadUserPort,
    private val loadIntersectionPort: LoadIntersectionPort,
    private val loadIncidentPort: LoadIncidentPort,
    private val passwordEncoder: PasswordEncoder
) : CommandLineRunner {

    private val logger = LoggerFactory.getLogger(DataInitializer::class.java)

    override fun run(vararg args: String?) {
        initUsers()
        initIntersections()
        initIncidents()
        logger.info("Semáforo+ (TECSUP Arequipa) data initialized successfully in H2 via Hexagonal Output Ports.")
    }

    private fun initUsers() {
        if (loadUserPort.count() == 0L) {
            val operator = User(
                username = "operador",
                password = passwordEncoder.encode("via2026"),
                fullName = "Operador de Tráfico (TECSUP)",
                role = "ROLE_OPERATOR",
                enabled = true
            )
            val admin = User(
                username = "admin",
                password = passwordEncoder.encode("admin123"),
                fullName = "Administrador del Sistema Semáforo+",
                role = "ROLE_ADMIN",
                enabled = true
            )
            loadUserPort.saveAll(listOf(operator, admin))
            logger.info("Default users seeded: 'operador' and 'admin'")
        }
    }

    private fun initIntersections() {
        if (loadIntersectionPort.count() == 0L) {
            val list = listOf(
                Intersection(
                    code = "INT-01",
                    name = "Av. Ejército × Av. Salaverry",
                    zone = "Yanahuara",
                    status = "Operativa",
                    mode = "ESP32 Adaptativo",
                    congestionPercent = 34,
                    greenNsSeconds = 38,
                    greenEwSeconds = 26,
                    solarBatteryLevel = 98,
                    esp32Status = "En línea",
                    esp32CamStatus = "Transmitiendo 1080p (24 fps)",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    code = "INT-02",
                    name = "Av. Ejército × Calle Los Arces",
                    zone = "Cayma",
                    status = "Operativa",
                    mode = "ESP32 Adaptativo",
                    congestionPercent = 72,
                    greenNsSeconds = 48,
                    greenEwSeconds = 22,
                    solarBatteryLevel = 92,
                    esp32Status = "En línea",
                    esp32CamStatus = "Transmitiendo 1080p (24 fps)",
                    emergencyPriorityActive = true
                ),
                Intersection(
                    code = "INT-03",
                    name = "Av. Cayma × Av. Bolognesi",
                    zone = "Cayma",
                    status = "Operativa",
                    mode = "ESP32 Adaptativo",
                    congestionPercent = 58,
                    greenNsSeconds = 34,
                    greenEwSeconds = 28,
                    solarBatteryLevel = 88,
                    esp32Status = "En línea",
                    esp32CamStatus = "Transmitiendo 1080p (20 fps)",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    code = "INT-04",
                    name = "Av. La Marina × Calle San Agustín",
                    zone = "Centro",
                    status = "Operativa",
                    mode = "ESP32 Adaptativo",
                    congestionPercent = 65,
                    greenNsSeconds = 42,
                    greenEwSeconds = 30,
                    solarBatteryLevel = 95,
                    esp32Status = "En línea",
                    esp32CamStatus = "Transmitiendo 1080p (25 fps)",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    code = "INT-05",
                    name = "Av. Goyeneche × Calle Paucarpata",
                    zone = "Centro",
                    status = "Operativa",
                    mode = "Autónomo (Solar)",
                    congestionPercent = 49,
                    greenNsSeconds = 32,
                    greenEwSeconds = 28,
                    solarBatteryLevel = 84,
                    esp32Status = "En línea",
                    esp32CamStatus = "Transmitiendo 720p (15 fps)",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    code = "INT-06",
                    name = "Av. Jesús × Av. Mariscal Castilla",
                    zone = "Paucarpata",
                    status = "Mantenimiento",
                    mode = "Fijo Preventivo",
                    congestionPercent = 81,
                    greenNsSeconds = 30,
                    greenEwSeconds = 30,
                    solarBatteryLevel = 76,
                    esp32Status = "Alerta Enlace",
                    esp32CamStatus = "Reconectando",
                    emergencyPriorityActive = false
                )
            )
            loadIntersectionPort.saveAll(list)
            logger.info("Sample Semáforo+ intersections seeded on Av. Ejército & Arequipa.")
        }
    }

    private fun initIncidents() {
        if (loadIncidentPort.count() == 0L) {
            val list = listOf(
                Incident(
                    code = "INC-101",
                    title = "Vehículo de emergencia detectado en Av. Ejército",
                    intersectionCode = "INT-02",
                    severity = "Alta",
                    status = "En curso",
                    description = "Ambulancia del SAMU aproximándose. ESP32 activó onda verde prioritaria para despeje de carril.",
                    reportedAt = LocalDateTime.now().minusMinutes(4)
                ),
                Incident(
                    code = "INC-102",
                    title = "Alta densidad vehicular por hora punta",
                    intersectionCode = "INT-06",
                    severity = "Media",
                    status = "Abierta",
                    description = "Congestión al 81% en giro hacia Av. Mariscal Castilla. Tiempos de luz verde optimizados a 45s.",
                    reportedAt = LocalDateTime.now().minusMinutes(18)
                ),
                Incident(
                    code = "INC-103",
                    title = "Respaldo solar activo en Av. Goyeneche",
                    intersectionCode = "INT-05",
                    severity = "Baja",
                    status = "Resuelta",
                    description = "Interrupción momentánea de red comercial. Sistema retrofit conmutó a panel solar y baterías sin interrupción de servicio.",
                    reportedAt = LocalDateTime.now().minusHours(2)
                )
            )
            loadIncidentPort.saveAll(list)
            logger.info("Sample Semáforo+ incidents seeded.")
        }
    }
}
