
package com.example.backend.service;

import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.UtilisateurRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.matricule}")
    private String matricule;

    @Value("${app.admin.nom-complet}")
    private String nomComplet;

    @Value("${app.admin.email}")
    private String email;

    @Value("${app.admin.mot-de-passe}")
    private String motDePasse;

    public AdminInitializer(
            UtilisateurRepository utilisateurRepository,
            PasswordEncoder passwordEncoder) {
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {

        if (matricule == null || !matricule.matches("\\d{7}")) {
            throw new IllegalStateException(
                    "Le matricule administrateur doit contenir exactement 7 chiffres."
            );
        }

        if (motDePasse == null
                || motDePasse.length() < 8
                || motDePasse.length() > 72) {
            throw new IllegalStateException(
                    "Le mot de passe administrateur doit contenir entre 8 et 72 caractères."
            );
        }

        Utilisateur admin = utilisateurRepository
                .findByMatricule(matricule)
                .orElseGet(Utilisateur::new);

        admin.setMatricule(matricule);
        admin.setNomComplet(nomComplet);
        admin.setEmail(email);
        admin.setMotDePasse(passwordEncoder.encode(motDePasse));
        admin.setRole("ADMINISTRATEUR");
        admin.setStatut("ACTIF");

        utilisateurRepository.saveAndFlush(admin);

        System.out.println(
                "Compte administrateur initialisé. Matricule : " + matricule
        );
    }
}
