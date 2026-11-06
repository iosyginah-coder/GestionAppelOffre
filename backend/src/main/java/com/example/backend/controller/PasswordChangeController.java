
package com.example.backend.controller;

import com.example.backend.service.PasswordResetService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://localhost:5173"
        },
        allowCredentials = "true"
)
public class PasswordChangeController {

    private final PasswordResetService passwordResetService;

    public PasswordChangeController(
            PasswordResetService passwordResetService) {

        this.passwordResetService = passwordResetService;
    }

    // Données reçues depuis le frontend

    public record ChangementMotDePasseDTO(
            String token,
            String ancienMotDePasse,
            String nouveauMotDePasse
    ) {}

    // MODIFIER LE MOT DE PASSE

    @PostMapping("/change-password")
    public ResponseEntity<?> changerMotDePasse(
            @RequestBody ChangementMotDePasseDTO demande) {

        try {

            if (demande == null) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "success", false,
                                "message", "Les données sont obligatoires."
                        )
                );
            }

            passwordResetService.changerMotDePasse(
                    demande.token(),
                    demande.ancienMotDePasse(),
                    demande.nouveauMotDePasse()
            );

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter."
                    )
            );

        } catch (IllegalArgumentException | IllegalStateException e) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.internalServerError().body(
                    Map.of(
                            "success", false,
                            "message",
                            "Une erreur est survenue lors de la modification du mot de passe."
                    )
            );
        }
    }
}
