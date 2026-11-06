package com.example.backend.controller;

import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.UtilisateurRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UtilisateurRepository utilisateurs;
    private final PasswordEncoder encoder;

    private final HttpSessionSecurityContextRepository contextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(
            UtilisateurRepository utilisateurs,
            PasswordEncoder encoder) {

        this.utilisateurs = utilisateurs;
        this.encoder = encoder;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody(required = false) LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (body == null
                || body.matricule() == null
                || body.motDePasse() == null
                || body.matricule().isBlank()
                || body.motDePasse().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Matricule et mot de passe obligatoires.")
            );
        }

        String matricule = body.matricule().trim();

        if (!matricule.matches("\\d{7}")) {
            return ResponseEntity.badRequest().body(
                    Map.of("message",
                            "Le matricule doit contenir exactement 7 chiffres.")
            );
        }

        Utilisateur user = utilisateurs
                .findByMatricule(matricule)
                .orElse(null);

        if (user == null
                || user.getMotDePasse() == null
                || !encoder.matches(
                body.motDePasse(),
                user.getMotDePasse())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message",
                            "Matricule ou mot de passe incorrect.")
            );
        }

        if (!"ACTIF".equalsIgnoreCase(user.getStatut())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of("message",
                            "Le compte est inactif ou suspendu.")
            );
        }

        if (user.getRole() == null || user.getRole().isBlank()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of("message",
                            "Aucun rôle n'est attribué à ce compte.")
            );
        }

        Authentication authentication =
                new UsernamePasswordAuthenticationToken(
                        user.getMatricule(),
                        null,
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + user.getRole()
                                )
                        )
                );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        request.getSession(true);

        contextRepository.saveContext(
                context,
                request,
                response
        );

        user.setDerniereConnexion(LocalDateTime.now());
        utilisateurs.save(user);

        return ResponseEntity.ok(
                new AuthResponse(
                        "Connexion réussie.",
                        user.getMatricule(),
                        user.getNomComplet(),
                        user.getRole(),
                        user.getEmail()
                )
        );
    }

    @GetMapping("/session")
    public ResponseEntity<?> session() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || authentication instanceof AnonymousAuthenticationToken
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof String matricule)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message", "Aucune session active.")
            );
        }

        Utilisateur user = utilisateurs
                .findByMatricule(matricule)
                .orElse(null);

        if (user == null
                || !"ACTIF".equalsIgnoreCase(user.getStatut())) {

            SecurityContextHolder.clearContext();

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message", "Session invalide.")
            );
        }

        return ResponseEntity.ok(
                new AuthResponse(
                        "Session active.",
                        user.getMatricule(),
                        user.getNomComplet(),
                        user.getRole(),
                        user.getEmail()
                )
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request,
            HttpServletResponse response) {

        HttpSession session = request.getSession(false);

        SecurityContextHolder.clearContext();

        if (session != null) {
            session.invalidate();
        }

        contextRepository.saveContext(
                SecurityContextHolder.createEmptyContext(),
                request,
                response
        );

        return ResponseEntity.ok(
                Map.of("message", "Déconnexion réussie.")
        );
    }

    public record LoginRequest(
            String matricule,
            String motDePasse
    ) {
    }

    public record AuthResponse(
            String message,
            String matricule,
            String nomComplet,
            String role,
            String email
    ) {
    }
}
