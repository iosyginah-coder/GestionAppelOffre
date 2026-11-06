
package com.example.backend.service;

import com.example.backend.entity.PasswordResetToken;
import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.PasswordResetTokenRepository;
import com.example.backend.repository.UtilisateurRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class PasswordResetService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailNotificationService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public PasswordResetService(
            UtilisateurRepository utilisateurRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            EmailNotificationService emailService) {

        this.utilisateurRepository = utilisateurRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // 1. GENERER UN MOT DE PASSE TEMPORAIRE

    private String genererMotDePasseTemporaire() {

        String caracteres =
                "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";

        StringBuilder resultat = new StringBuilder();

        for (int i = 0; i < 14; i++) {
            resultat.append(
                    caracteres.charAt(
                            secureRandom.nextInt(caracteres.length())
                    )
            );
        }

        return resultat.toString();
    }

    // 2. GENERER UN TOKEN SECURISE

    private String genererToken() {

        byte[] bytes = new byte[32];

        secureRandom.nextBytes(bytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    // 3. HASHER LE TOKEN

    private String hasherToken(String token) {

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return java.util.HexFormat.of().formatHex(hash);

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Erreur lors du hachage du token.",
                    e
            );
        }
    }

    // 4. ENVOYER LE MOT DE PASSE TEMPORAIRE ET LE LIEN
    // APPELE LORSQUE L'ADMINISTRATEUR ACCEPTE LA DEMANDE

    @Transactional
    public void envoyerNouveauMotDePasse(String matricule) {

        Utilisateur utilisateur = utilisateurRepository
                .findByMatricule(matricule.trim())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Utilisateur introuvable."
                        )
                );

        if (utilisateur.getEmail() == null
                || utilisateur.getEmail().isBlank()) {

            throw new IllegalStateException(
                    "L'utilisateur ne possède pas d'adresse email."
            );
        }

        // Générer le mot de passe temporaire

        String motDePasseTemporaire =
                genererMotDePasseTemporaire();

        // Générer le token

        String token = genererToken();

        // Supprimer les anciens tokens

        tokenRepository.deleteAllByMatricule(matricule);

        // Créer le nouveau token

        PasswordResetToken resetToken =
                new PasswordResetToken();

        resetToken.setMatricule(matricule);
        resetToken.setTokenHash(hasherToken(token));

        resetToken.setDateExpiration(
                LocalDateTime.now().plusMinutes(15)
        );

        resetToken.setUtilise(false);

        tokenRepository.save(resetToken);

        // Enregistrer le mot de passe temporaire avec BCrypt

        utilisateur.setMotDePasse(
                passwordEncoder.encode(motDePasseTemporaire)
        );

        utilisateurRepository.save(utilisateur);

        // Construire le lien frontend

        String lien = frontendUrl
                + "/changer-mot-de-passe?token="
                + token;

        // Envoyer l'email à l'utilisateur

        emailService.envoyerEmailReinitialisation(
                utilisateur.getEmail(),
                utilisateur.getNomComplet(),
                utilisateur.getMatricule(),
                motDePasseTemporaire,
                lien
        );
    }

    // 5. MODIFIER LE MOT DE PASSE

    @Transactional
    public void changerMotDePasse(
            String token,
            String ancienMotDePasse,
            String nouveauMotDePasse) {

        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException(
                    "Le lien de réinitialisation est invalide."
            );
        }

        if (ancienMotDePasse == null
                || ancienMotDePasse.isBlank()
                || nouveauMotDePasse == null
                || nouveauMotDePasse.isBlank()) {

            throw new IllegalArgumentException(
                    "Tous les champs sont obligatoires."
            );
        }

        // Vérifier la qualité du nouveau mot de passe

        if (nouveauMotDePasse.length() < 8
                || !nouveauMotDePasse.matches(".*[A-Z].*")
                || !nouveauMotDePasse.matches(".*[a-z].*")
                || !nouveauMotDePasse.matches(".*[0-9].*")) {

            throw new IllegalArgumentException(
                    "Le nouveau mot de passe doit contenir au moins "
                            + "8 caractères, une majuscule, une minuscule "
                            + "et un chiffre."
            );
        }

        // Rechercher le token

        String tokenHash = hasherToken(token);

        PasswordResetToken resetToken = tokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Lien invalide ou inexistant."
                        )
                );

        // Vérifier si le lien a déjà été utilisé

        if (resetToken.isUtilise()) {
            throw new IllegalStateException(
                    "Ce lien a déjà été utilisé."
            );
        }

        // Vérifier l'expiration

        if (resetToken.getDateExpiration()
                .isBefore(LocalDateTime.now())) {

            throw new IllegalStateException(
                    "Ce lien a expiré. Veuillez demander une nouvelle réinitialisation."
            );
        }

        // Rechercher l'utilisateur

        Utilisateur utilisateur = utilisateurRepository
                .findByMatricule(resetToken.getMatricule())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Utilisateur introuvable."
                        )
                );

        // Vérifier l'ancien mot de passe temporaire

        if (!passwordEncoder.matches(
                ancienMotDePasse,
                utilisateur.getMotDePasse())) {

            throw new IllegalArgumentException(
                    "L'ancien mot de passe est incorrect."
            );
        }

        // Empêcher de conserver le même mot de passe

        if (passwordEncoder.matches(
                nouveauMotDePasse,
                utilisateur.getMotDePasse())) {

            throw new IllegalArgumentException(
                    "Le nouveau mot de passe doit être différent de l'ancien."
            );
        }

        // Enregistrer le nouveau mot de passe

        utilisateur.setMotDePasse(
                passwordEncoder.encode(nouveauMotDePasse)
        );

        utilisateurRepository.save(utilisateur);

        // Invalider le token

        resetToken.setUtilise(true);

        tokenRepository.save(resetToken);
    }
}
