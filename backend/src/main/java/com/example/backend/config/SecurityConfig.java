
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

    // =====================================================
    // ENCODAGE MOT DE PASSE
    // =====================================================

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    // =====================================================
    // CONFIGURATION SECURITY
    // =====================================================

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                // Activation CORS
                .cors(cors ->
                        cors.configurationSource(corsConfigurationSource())
                )

                // Autoriser le formulaire multipart public
                .csrf(csrf -> csrf.disable())

                // Gestion des sessions
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.IF_REQUIRED
                        )
                )

                // Autorisations
                .authorizeHttpRequests(auth -> auth

                        // Autoriser les requêtes OPTIONS (préflight CORS)
                        .requestMatchers(
                                HttpMethod.OPTIONS,
                                "/**"
                        ).permitAll()

                        // Authentification
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/logout",
                                "/api/auth/session",
                                "/error",
                                "/favicon.ico"
                        ).permitAll()

                        // Changement du mot de passe
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/change-password"
                        ).permitAll()

                        // Demande publique de réinitialisation
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/password-reset-requests"
                        ).permitAll()

                        // Consultation réservée à l'administrateur
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/auth/password-reset-requests"
                        ).hasRole("ADMINISTRATEUR")

                        // Traitement réservé à l'administrateur
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/auth/password-reset-requests/**"
                        ).hasRole("ADMINISTRATEUR")

                        // Gestion des utilisateurs
                        .requestMatchers(
                                "/api/utilisateurs/**"
                        ).hasRole("ADMINISTRATEUR")

                        // =========================================
                        // DEPOT PUBLIC DE L'OFFRE
                        // =========================================

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/offres/deposer"
                        ).permitAll()

                        // =========================================
                        // CONSULTATION PUBLIQUE DES APPELS D'OFFRES
                        // =========================================

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/appel-offres/publications",
                                "/api/appel-offres/publications/**",
                                "/api/photos/public/**",
                                "/api/pieces-requises/public/**"
                        ).permitAll()

                        // Toutes les autres routes restent protégées
                        .anyRequest().authenticated()
                )

                // Gestion des erreurs d'authentification
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                new HttpStatusEntryPoint(
                                        HttpStatus.UNAUTHORIZED
                                )
                        )
                )

                // Désactivation HTTP Basic et formulaire Spring
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable());

        return http.build();
    }

    // =====================================================
    // CONFIGURATION CORS
    // =====================================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration cors = new CorsConfiguration();

        // Autoriser localhost et les domaines Ngrok
        cors.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",

                "https://feeble-vocation-plasma.ngrok-free.dev",
                "https://*.ngrok-free.dev",
                "https://*.ngrok-free.app",
                "https://*.ngrok.app"
        ));

        // Méthodes autorisées
        cors.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        // Autoriser les en-têtes
        cors.setAllowedHeaders(List.of("*"));

        // Autoriser les cookies de session
        cors.setAllowCredentials(true);

        // Durée de validité du préflight
        cors.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", cors);

        return source;
    }
}
