
package com.example.backend.controller;

import com.example.backend.entity.DemandeReinitialisation;
import com.example.backend.entity.StatutDemande;
import com.example.backend.repository.DemandeReinitialisationRepository;
import com.example.backend.repository.UtilisateurRepository;
import com.example.backend.service.EmailNotificationService;
import com.example.backend.service.PasswordResetService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private static final Logger log =
            LoggerFactory.getLogger(PasswordResetController.class);

    private final DemandeReinitialisationRepository demandeRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final EmailNotificationService emailService;
    private final PasswordResetService passwordResetService;

    public PasswordResetController(
            DemandeReinitialisationRepository demandeRepository,
            UtilisateurRepository utilisateurRepository,
            EmailNotificationService emailService,
            PasswordResetService passwordResetService) {

        this.demandeRepository = demandeRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.emailService = emailService;
        this.passwordResetService = passwordResetService;
    }

    // 1. ENREGISTRER UNE DEMANDE DE REINITIALISATION

    @PostMapping("/password-reset-requests")
    public ResponseEntity<Map<String, Object>> creerDemande(
            @RequestBody(required = false) Map<String, String> body) {

        if (body == null || body.get("matricule") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le matricule est obligatoire."
            );
        }

        String matricule = body.get("matricule").trim();

        if (!matricule.matches("\\d{7}")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le matricule doit contenir exactement 7 chiffres."
            );
        }

        utilisateurRepository.findByMatricule(matricule)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Aucun utilisateur ne correspond à ce matricule."
                ));

        try {
            boolean demandeExistante =
                    demandeRepository.existsByMatriculeAndStatut(
                            matricule,
                            StatutDemande.EN_ATTENTE
                    );

            if (demandeExistante) {
                return ResponseEntity.ok(
                        Map.of(
                                "success", true,
                                "dejaEnAttente", true,
                                "message",
                                "Une demande de réinitialisation est déjà en attente pour ce matricule."
                        )
                );
            }

        } catch (DataAccessException exception) {

            log.error(
                    "Erreur lors de la vérification des demandes du matricule {}",
                    matricule,
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible de vérifier les demandes."
            );
        }

        DemandeReinitialisation demande =
                new DemandeReinitialisation();

        demande.setMatricule(matricule);
        demande.setStatut(StatutDemande.EN_ATTENTE);
        demande.setDateDemande(LocalDateTime.now());

        try {
            demandeRepository.saveAndFlush(demande);

        } catch (DataAccessException exception) {

            log.error(
                    "Erreur SQL lors de l'enregistrement de la demande {}",
                    matricule,
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible d'enregistrer la demande dans la base de données."
            );
        }

        // Notification de l'administrateur

        try {
            emailService.envoyerDemandeReinitialisation(matricule);

        } catch (Exception exception) {

            log.error(
                    "Demande enregistrée, mais e-mail administrateur non envoyé. Matricule : {}",
                    matricule,
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Votre demande a été enregistrée et reste visible dans le tableau de bord de l'administrateur. La notification par e-mail n'a pas pu être envoyée."
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "emailEnvoye", true,
                        "statut", StatutDemande.EN_ATTENTE.name(),
                        "message",
                        "Votre demande a été enregistrée. L'administrateur a été notifié."
                )
        );
    }

    // 2. AFFICHER LES DEMANDES DANS LE TABLEAU DE BORD ADMIN

    @GetMapping("/password-reset-requests")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<List<DemandeReinitialisation>> obtenirDemandes() {

        try {
            List<DemandeReinitialisation> demandes =
                    demandeRepository.findAllByOrderByDateDemandeDesc();

            return ResponseEntity.ok(demandes);

        } catch (DataAccessException exception) {

            log.error(
                    "Erreur lors du chargement des demandes de réinitialisation",
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible de charger les demandes."
            );
        }
    }

    // 3. ACCEPTER OU REFUSER UNE DEMANDE

    @PatchMapping("/password-reset-requests/{id}/statut")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Map<String, String>> traiterDemande(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        if (body == null
                || body.get("statut") == null
                || body.get("statut").isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le statut est obligatoire."
            );
        }

        // Vérifier le nouveau statut

        StatutDemande nouveauStatut;

        try {
            nouveauStatut = StatutDemande.valueOf(
                    body.get("statut").trim().toUpperCase(Locale.ROOT)
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le statut doit être TRAITEE ou REJETEE."
            );
        }

        if (nouveauStatut == StatutDemande.EN_ATTENTE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Une demande ne peut pas être remise en attente."
            );
        }

        // Rechercher la demande

        DemandeReinitialisation demande =
                demandeRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Demande de réinitialisation introuvable."
                        ));

        // Vérifier que la demande est encore en attente

        if (demande.getStatut() != StatutDemande.EN_ATTENTE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette demande a déjà été traitée."
            );
        }

        String matricule = demande.getMatricule();

        // Vérifier que l'utilisateur existe

        utilisateurRepository.findByMatricule(matricule)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "L'utilisateur associé à cette demande est introuvable."
                ));

        boolean emailRefusEnvoye = true;

        // CAS 1 : ACCEPTATION

        if (nouveauStatut == StatutDemande.TRAITEE) {

            try {

                /*
                 * Générer un mot de passe temporaire.
                 * Enregistrer son hash BCrypt.
                 * Créer un token sécurisé valable 15 minutes.
                 * Envoyer le mot de passe temporaire et le lien
                 * de changement de mot de passe par e-mail.
                 */

                passwordResetService.envoyerNouveauMotDePasse(matricule);

            } catch (Exception exception) {

                log.error(
                        "Erreur lors de l'acceptation de la demande {} pour le matricule {}",
                        id,
                        matricule,
                        exception
                );

                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "La réinitialisation a échoué. Le mot de passe temporaire et le lien n'ont pas pu être envoyés. Vérifiez la configuration Gmail et réessayez."
                );
            }
        }

        // CAS 2 : REFUS

        else if (nouveauStatut == StatutDemande.REJETEE) {

            try {
                emailService.envoyerNotificationDemandeRejetee(matricule);

            } catch (Exception exception) {

                emailRefusEnvoye = false;

                log.error(
                        "Demande {} refusée, mais e-mail de notification non envoyé. Matricule : {}",
                        id,
                        matricule,
                        exception
                );
            }
        }

        // Enregistrer le statut après le traitement

        demande.setStatut(nouveauStatut);
        demande.setDateTraitement(LocalDateTime.now());

        try {
            demandeRepository.saveAndFlush(demande);

        } catch (DataAccessException exception) {

            log.error(
                    "Erreur SQL lors de la sauvegarde du traitement de la demande {}",
                    id,
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "L'action a été effectuée, mais le statut n'a pas pu être enregistré."
            );
        }

        // Préparer le message de réponse

        String message;

        if (nouveauStatut == StatutDemande.TRAITEE) {

            message =
                    "Demande acceptée. Le mot de passe temporaire et le lien de changement de mot de passe ont été envoyés par e-mail.";

        } else if (emailRefusEnvoye) {

            message =
                    "Demande refusée. La notification a été envoyée par e-mail.";

        } else {

            message =
                    "Demande refusée. La notification par e-mail n'a pas pu être envoyée.";
        }

        return ResponseEntity.ok(
                Map.of(
                        "success", "true",
                        "message", message,
                        "statut", nouveauStatut.name(),
                        "matricule", matricule
                )
        );
    }
}
