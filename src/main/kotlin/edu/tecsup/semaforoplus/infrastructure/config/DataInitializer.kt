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
                    name = "Av. Ejército × Av. Salaverry",
                    zone = "Yanahuara",
                    status = "Operativa",
                    mode = "ESP32 Adaptativo (Local 100%)",
                    congestionPercent = 34,
                    greenNsSeconds = 38,
                    greenEwSeconds = 30,
                    solarBatteryLevel = 96,
                    esp32Status = "AUTÓNOMO_LOCAL_ACTIVO",
                    esp32CamStatus = "2/2 ESP32-CAM Activas (On-Edge ML)",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 2L,
                    code = "INT-02",
                    name = "Av. Goyeneche × Av. Parra",
                    zone = "Centro",
                    status = "Atención",
                    mode = "Adaptativo",
                    congestionPercent = 78,
                    greenNsSeconds = 45,
                    greenEwSeconds = 32,
                    solarBatteryLevel = 88,
                    esp32Status = "En línea",
                    esp32CamStatus = "Cámaras conectadas",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 3L,
                    code = "INT-03",
                    name = "Av. Dolores × Av. Mariscal Castilla",
                    zone = "Paucarpata",
                    status = "Operativa",
                    mode = "Automático",
                    congestionPercent = 52,
                    greenNsSeconds = 36,
                    greenEwSeconds = 34,
                    solarBatteryLevel = 92,
                    esp32Status = "En línea",
                    esp32CamStatus = "Cámaras conectadas",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 4L,
                    code = "INT-04",
                    name = "Av. Venezuela × Av. Jesús",
                    zone = "Miraflores",
                    status = "Operativa",
                    mode = "Automático",
                    congestionPercent = 27,
                    greenNsSeconds = 32,
                    greenEwSeconds = 32,
                    solarBatteryLevel = 95,
                    esp32Status = "En línea",
                    esp32CamStatus = "Cámaras conectadas",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 5L,
                    code = "INT-05",
                    name = "Av. Kennedy × Av. Ejército",
                    zone = "Cayma",
                    status = "Operativa",
                    mode = "Adaptativo",
                    congestionPercent = 44,
                    greenNsSeconds = 34,
                    greenEwSeconds = 36,
                    solarBatteryLevel = 90,
                    esp32Status = "En línea",
                    esp32CamStatus = "Cámaras conectadas",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 6L,
                    code = "INT-06",
                    name = "Puente Bolognesi × Av. Independencia",
                    zone = "Centro",
                    status = "Atención",
                    mode = "Manual",
                    congestionPercent = 86,
                    greenNsSeconds = 48,
                    greenEwSeconds = 30,
                    solarBatteryLevel = 85,
                    esp32Status = "En línea",
                    esp32CamStatus = "Cámaras conectadas",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 7L,
                    code = "INT-07",
                    name = "Av. Aviación × Av. Alcides Carrión",
                    zone = "Miraflores",
                    status = "Operativa",
                    mode = "Automático",
                    congestionPercent = 61,
                    greenNsSeconds = 40,
                    greenEwSeconds = 30,
                    solarBatteryLevel = 91,
                    esp32Status = "En línea",
                    esp32CamStatus = "Cámaras conectadas",
                    emergencyPriorityActive = false
                ),
                Intersection(
                    id = 8L,
                    code = "INT-08",
                    name = "Av. La Marina × Av. Metropolitana",
                    zone = "J. L. Bustamante",
                    status = "Sin datos",
                    mode = "Automático",
                    congestionPercent = 39,
                    greenNsSeconds = 34,
                    greenEwSeconds = 34,
                    solarBatteryLevel = 0,
                    esp32Status = "Sin señal",
                    esp32CamStatus = "Sin señal",
                    emergencyPriorityActive = false
                )
            )
            loadIntersectionPort.saveAll(list)
            logger.info("8 metropolitan intersections initialized in H2 database.")
        }
    }

    private fun initIncidents() {
        if (loadIncidentPort.count() == 0L) {
            val list = listOf(
                Incident(
                    code = "INC-1041",
                    title = "Congestión elevada",
                    intersectionCode = "INT-06",
                    severity = "Alta",
                    status = "Nueva",
                    description = "Congestión sostenida por encima del 85 % en Puente Bolognesi; cola estimada de 14 vehículos hacia Av. Independencia.",
                    reportedAt = LocalDateTime.now().minusMinutes(6)
                ),
                Incident(
                    code = "INC-1040",
                    title = "Posible incidente vial",
                    intersectionCode = "INT-06",
                    severity = "Alta",
                    status = "Revisada",
                    description = "Se detectan vehículos detenidos en el carril central; posible colisión leve. Pendiente de confirmación visual.",
                    reportedAt = LocalDateTime.now().minusMinutes(22)
                ),
                Incident(
                    code = "INC-1039",
                    title = "Incremento repentino de vehículos",
                    intersectionCode = "INT-02",
                    severity = "Media",
                    status = "Nueva",
                    description = "Aumento del 22 % en el conteo de vehículos en 5 minutos en el acceso norte de Av. Goyeneche.",
                    reportedAt = LocalDateTime.now().minusMinutes(14)
                ),
                Incident(
                    code = "INC-1038",
                    title = "Pérdida de datos de sensor",
                    intersectionCode = "INT-08",
                    severity = "Media",
                    status = "Nueva",
                    description = "El sensor ultrasónico del acceso norte no envía lecturas desde hace 12 minutos. Se muestran los últimos valores registrados.",
                    reportedAt = LocalDateTime.now().minusMinutes(38)
                ),
                Incident(
                    code = "INC-1037",
                    title = "Congestión elevada",
                    intersectionCode = "INT-02",
                    severity = "Alta",
                    status = "Nueva",
                    description = "Tiempo de espera medio superior a 90 s en Av. Goyeneche × Av. Parra durante más de 10 minutos.",
                    reportedAt = LocalDateTime.now().minusMinutes(31)
                ),
                Incident(
                    code = "INC-1036",
                    title = "Semáforo en modo manual",
                    intersectionCode = "INT-06",
                    severity = "Baja",
                    status = "Revisada",
                    description = "El operador de turno cambió la intersección a modo manual para gestionar el evento en curso.",
                    reportedAt = LocalDateTime.now().minusMinutes(47)
                ),
                Incident(
                    code = "INC-1032",
                    title = "Cámara degradada",
                    intersectionCode = "INT-02",
                    severity = "Baja",
                    status = "Nueva",
                    description = "CAM-03 reporta calidad de imagen reducida y pérdida intermitente de cuadros.",
                    reportedAt = LocalDateTime.now().minusMinutes(55)
                ),
                Incident(
                    code = "INC-1035",
                    title = "Vehículo detenido",
                    intersectionCode = "INT-07",
                    severity = "Media",
                    status = "Resuelta",
                    description = "Vehículo detenido en el carril derecho de Av. Aviación; retirado por el personal de apoyo.",
                    reportedAt = LocalDateTime.now().minusMinutes(92)
                ),
                Incident(
                    code = "INC-1034",
                    title = "Desfase de ciclo",
                    intersectionCode = "INT-05",
                    severity = "Baja",
                    status = "Resuelta",
                    description = "Desfase de 3 s entre el ciclo programado y el medido. Corregido tras resincronizar el controlador.",
                    reportedAt = LocalDateTime.now().minusMinutes(140)
                ),
                Incident(
                    code = "INC-1033",
                    title = "Incremento repentino de vehículos",
                    intersectionCode = "INT-03",
                    severity = "Media",
                    status = "Resuelta",
                    description = "Pico de vehículos por evento en la zona; el flujo volvió a valores normales sin intervención.",
                    reportedAt = LocalDateTime.now().minusMinutes(185)
                ),
                Incident(
                    code = "INC-1031",
                    title = "Congestión elevada",
                    intersectionCode = "INT-07",
                    severity = "Media",
                    status = "Resuelta",
                    description = "Congestión del 72 % en hora punta; se resolvió al ampliar el verde N–S en el plan adaptativo.",
                    reportedAt = LocalDateTime.now().minusMinutes(260)
                )
            )
            loadIncidentPort.saveAll(list)
            logger.info("11 incidents initialized in H2 database.")
        }
    }
}
