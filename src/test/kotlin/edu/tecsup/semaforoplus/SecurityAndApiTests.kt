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
}
