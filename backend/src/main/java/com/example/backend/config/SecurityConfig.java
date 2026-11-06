
package com.example.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )

                .authorizeHttpRequests(auth -> auth

                        // Autoriser les requêtes CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Authentification
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/logout",
                                "/api/auth/session",
                                "/error",
                                "/favicon.ico"
                        ).permitAll()

                        // Changement du mot de passe avec le lien reçu par e-mail
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/change-password"
                        ).permitAll()

                        // Demande publique de réinitialisation
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/password-reset-requests"
                        ).permitAll()

                        // Consultation des demandes : administrateur uniquement
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/auth/password-reset-requests"
                        ).hasRole("ADMINISTRATEUR")

                        // Traitement des demandes : administrateur uniquement
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/auth/password-reset-requests/**"
                        ).hasRole("ADMINISTRATEUR")

                        // Gestion des utilisateurs
                        .requestMatchers(
                                "/api/utilisateurs/**"
                        ).hasRole("ADMINISTRATEUR")

                        // Toutes les autres routes nécessitent une authentification
                        .anyRequest().authenticated()
                )

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)
                        )
                )

                .httpBasic(basic -> basic.disable())

                .formLogin(form -> form.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration cors = new CorsConfiguration();

        cors.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        ));

        cors.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        cors.setAllowedHeaders(List.of("*"));

        // Indispensable pour les cookies de session
        cors.setAllowCredentials(true);

        cors.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", cors);

        return source;
    }
}
