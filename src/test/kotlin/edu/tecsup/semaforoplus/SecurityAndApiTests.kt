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
    }

    @Test
    @WithMockUser(username = "operador", roles = ["OPERATOR"])
    fun `authenticated operator can access intersections from H2`() {
        mockMvc.perform(get("/api/v1/intersections"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$[0].code").value("INT-01"))
    }
}
