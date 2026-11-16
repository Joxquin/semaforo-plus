package edu.tecsup.semaforoplus.infrastructure.adapter.`in`.web

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class WebController {

    @GetMapping("/")
    fun home(): String = "forward:/index.html"

    @GetMapping("/dashboard")
    fun dashboard(): String = "forward:/index.html"

    @GetMapping("/intersecciones")
    fun intersecciones(): String = "forward:/intersecciones.html"

    @GetMapping("/camaras")
    fun camaras(): String = "forward:/camaras.html"

    @GetMapping("/analisis")
    fun analisis(): String = "forward:/analisis.html"

    @GetMapping("/predicciones")
    fun predicciones(): String = "forward:/predicciones.html"

    @GetMapping("/incidencias")
    fun incidencias(): String = "forward:/incidencias.html"

    @GetMapping("/reportes")
    fun reportes(): String = "forward:/reportes.html"

    @GetMapping("/configuracion")
    fun configuracion(): String = "forward:/configuracion.html"

    @GetMapping("/login")
    fun login(): String = "forward:/login.html"
}
