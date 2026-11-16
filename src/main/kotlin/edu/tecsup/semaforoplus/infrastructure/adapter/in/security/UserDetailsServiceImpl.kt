package edu.tecsup.semaforoplus.infrastructure.adapter.`in`.security

import edu.tecsup.semaforoplus.application.port.out.LoadUserPort
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class UserDetailsServiceImpl(
    private val loadUserPort: LoadUserPort
) : UserDetailsService {

    override fun loadUserByUsername(username: String): UserDetails {
        val domainUser = loadUserPort.findByUsername(username)
            ?: throw UsernameNotFoundException("Usuario no encontrado: $username")

        return User.builder()
            .username(domainUser.username)
            .password(domainUser.password)
            .authorities(listOf(SimpleGrantedAuthority(domainUser.role)))
            .disabled(!domainUser.enabled)
            .build()
    }
}
