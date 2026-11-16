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
        logger.info("Semáforo+ (TECSUP Arequipa) Hexagonal data initialized with 8-node network and real ESP32 testbed.")
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
            val list = listOf(
                Intersection(
                    id = 1L,
                    code = "INT-01",
                    name = "Av. Ejército × Calle Los Arces",
                    zone = "Yanahuara",
                    status = "Sin señal",
                    mode = "ESP32 Adaptativo (Local 100%)",
                    congestionPercent = 0,
                    greenNsSeconds = 0,
                    greenEwSeconds = 0,
                    solarBatteryLevel = 0,
                    esp32Status = "DESCONECTADO",
                    esp32CamStatus = "0/2 ESP32-CAM (Sin señal)",
                    emergencyPriorityActive = false
                )
            )
            loadIntersectionPort.saveAll(list)
            logger.info("Única intersección real inicializada: INT-01 (Av. Ejército × Calle Los Arces) con 2 semáforos y 2 ESP32-CAM.")
        }
    }

    private fun initIncidents() {
        // Sin incidencias hardcodeadas: la lista se puebla dinámicamente cuando el hardware reporta eventos o desconexión
        if (loadIncidentPort.count() == 0L) {
            val list = listOf(
                Incident(
                    code = "INC-1001",
                    title = "Dispositivos IoT Desconectados",
                    intersectionCode = "INT-01",
                    severity = "Alta",
                    status = "Nueva",
                    description = "Sin enlace activo con el microcontrolador central ESP32 ni con las cámaras ESP32-CAM. Estado: Sin señal de hardware.",
                    reportedAt = LocalDateTime.now()
                )
            )
            loadIncidentPort.saveAll(list)
            logger.info("Estado inicial registrado para INT-01: Dispositivos IoT Desconectados.")
        }
    }
}
