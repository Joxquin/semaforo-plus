package edu.tecsup.semaforoplus

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
class SecurityAndApiTests {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `public resources should be accessible without authentication`() {
        mockMvc.perform(get("/login.html"))
            .andExpect(status().isOk)

        mockMvc.perform(get("/login"))
            .andExpect(status().isOk)
    }

    @Test
    fun `unauthenticated user requesting protected dashboard should be redirected to login`() {
        mockMvc.perform(get("/dashboard"))
            .andExpect(status().is3xxRedirection)
    }

    @Test
    fun `valid login should redirect to index page`() {
        mockMvc.perform(
            post("/login")
                .param("username", "operador")
                .param("password", "via2026")
        )
            .andExpect(status().is3xxRedirection)
            .andExpect(redirectedUrl("/index.html"))
    }

    @Test
    fun `invalid login should redirect to login error`() {
        mockMvc.perform(
            post("/login")
                .param("username", "operador")
                .param("password", "wrongpass")
        )
            .andExpect(status().is3xxRedirection)
            .andExpect(redirectedUrl("/login.html?error=true"))
    }

    @Test
    @WithMockUser(username = "operador", roles = ["OPERATOR"])
    fun `authenticated operator can access API information`() {
        mockMvc.perform(get("/api/v1/info"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.project").value("Semáforo+"))
            .andExpect(jsonPath("$.institution").value("TECSUP (Arequipa)"))
            .andExpect(jsonPath("$.problemDiagnostic.citizensAffectedPercentage").value(69))
            .andExpect(jsonPath("$.physicalNode.trafficLightsCount").value(2))
            .andExpect(jsonPath("$.physicalNode.camerasCount").value(2))
    }

    @Test
    @WithMockUser(username = "operador", roles = ["OPERATOR"])
    fun `authenticated operator can access real intersection from H2`() {
        mockMvc.perform(get("/api/v1/intersections"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].code").value("INT-01"))
            .andExpect(jsonPath("$[0].name").value("Av. Ejército × Calle Los Arces"))
    }

    @Test
    @WithMockUser(username = "operador", roles = ["OPERATOR"])
    fun `authenticated operator can access realtime dual cameras and lights`() {
        mockMvc.perform(get("/api/v1/realtime/node"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.code").value("NODE-01"))
            .andExpect(jsonPath("$.cameras.length()").value(2))
            .andExpect(jsonPath("$.trafficLights.length()").value(2))

        mockMvc.perform(get("/api/v1/realtime/cameras"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("CAM-01"))
            .andExpect(jsonPath("$[1].id").value("CAM-02"))

        mockMvc.perform(get("/api/v1/realtime/traffic-lights"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("SEM-01"))
            .andExpect(jsonPath("$[1].id").value("SEM-02"))
    }

    @Test
    fun `iot devices can post telemetry and camera detection directly without session`() {
        // 1. ESP32-CAM POST detection
        val camPayload = """
            {
              "camId": "CAM-01",
              "carril": "Av. Ejército",
              "autos": 7,
              "combis": 2,
              "motos": 1,
              "peatones": 3,
              "unidadesEmergencia": 0,
              "latencyMs": 138,
              "fps": 20
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/v1/iot/cam/detection")
                .contentType("application/json")
                .content(camPayload)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("ACK"))
            .andExpect(jsonPath("$.camId").value("CAM-01"))
            .andExpect(jsonPath("$.online").value(true))

        // 2. ESP32 Central POST telemetry
        val espPayload = """
            {
              "deviceId": "ESP32-CENTRAL-01",
              "nodeCode": "NODE-01",
              "sem1State": "GREEN",
              "sem2State": "RED",
              "remainingSeconds": 28,
              "sem1AllocatedSeconds": 40,
              "sem2AllocatedSeconds": 20,
              "batteryVoltage": 13.55,
              "batteryPercent": 94,
              "powerSource": "HÍBRIDO (Solar LiFePO4)",
              "emergencyActive": false
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/v1/iot/esp32/telemetry")
                .contentType("application/json")
                .content(espPayload)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("ACK"))
            .andExpect(jsonPath("$.centralStatus").value("AUTÓNOMO_LOCAL_ACTIVO"))

        // 3. Verify node now reports online IoT data
        mockMvc.perform(get("/api/v1/realtime/node"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.iotConnected").value(true))
            .andExpect(jsonPath("$.solarBackup.batteryPercent").value(94))
            .andExpect(jsonPath("$.solarBackup.batteryVoltage").value(13.55))
            .andExpect(jsonPath("$.cameras[0].classification.autos").value(7))
    }
}
