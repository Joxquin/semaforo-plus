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
        logger.info("Semáforo+ (TECSUP Arequipa) real dual-camera & dual-traffic-light node initialized successfully.")
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
            logger.info("Users initialized: 'operador' and 'admin'")
        }
    }

    private fun initIntersections() {
        if (loadIntersectionPort.count() == 0L) {
            val realIntersection = Intersection(
                id = 1L,
                code = "INT-01",
                name = "Av. Ejército × Calle Los Arces",
                zone = "Yanahuara / Cayma (Arequipa)",
                status = "Operativa",
                mode = "ESP32 Adaptativo (Local 100%)",
                congestionPercent = 42,
                greenNsSeconds = 38,
                greenEwSeconds = 22,
                solarBatteryLevel = 96,
                esp32Status = "AUTÓNOMO_LOCAL_ACTIVO",
                esp32CamStatus = "2/2 ESP32-CAM Activas (On-Edge ML)",
                emergencyPriorityActive = false
            )
            loadIntersectionPort.saveAll(listOf(realIntersection))
            logger.info("Real intersection node initialized: Av. Ejército × Calle Los Arces (2 Semáforos + 2 ESP32-CAM).")
        }
    }

    private fun initIncidents() {
        if (loadIncidentPort.count() == 0L) {
            val list = listOf(
                Incident(
                    code = "EVT-201",
                    title = "Sistema iniciado en modo autónomo local",
                    intersectionCode = "INT-01",
                    severity = "Baja",
                    status = "Resuelta",
                    description = "ESP32 central completó autodiagnóstico: enlace con CAM-01 (Av. Ejército) y CAM-02 (Calle Los Arces) establecido a 20 FPS.",
                    reportedAt = LocalDateTime.now().minusMinutes(35)
                ),
                Incident(
                    code = "EVT-202",
                    title = "Respaldo solar en flotación normal (13.6V · 96%)",
                    intersectionCode = "INT-01",
                    severity = "Baja",
                    status = "Resuelta",
                    description = "Panel solar de 50W recargando batería LiFePO4; autonomía estimada de 18.5 horas ante corte eléctrico.",
                    reportedAt = LocalDateTime.now().minusMinutes(12)
                ),
                Incident(
                    code = "EVT-203",
                    title = "Prioridad preventiva de transporte público",
                    intersectionCode = "INT-01",
                    severity = "Media",
                    status = "Resuelta",
                    description = "CAM-01 detectó 3 combis en cola. ESP32 extendió tiempo verde en 8 segundos respetando el máximo de 60s.",
                    reportedAt = LocalDateTime.now().minusMinutes(3)
                )
            )
            loadIncidentPort.saveAll(list)
            logger.info("Real operational incident log initialized.")
        }
    }
}
