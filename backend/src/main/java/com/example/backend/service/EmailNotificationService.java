
package com.example.backend.service;

import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.UtilisateurRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class EmailNotificationService {

    private static final Logger log =
            LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final UtilisateurRepository utilisateurRepository;

    @Value("${app.admin.email}")
    private String adresseAdministrateur;

    @Value("${spring.mail.username}")
    private String adresseExpediteur;

    public EmailNotificationService(
            JavaMailSender mailSender,
            UtilisateurRepository utilisateurRepository) {

        this.mailSender = mailSender;
        this.utilisateurRepository = utilisateurRepository;
    }

    // 1. EMAIL APRES CREATION D'UN COMPTE

    public void envoyerIdentifiants(
            String email,
            String matricule,
            String motDePasse) {

        verifierMatricule(matricule);
        verifierAdresseEmail(email, "L'adresse e-mail de l'utilisateur");

        if (!StringUtils.hasText(motDePasse)) {
            throw new IllegalArgumentException(
                    "Le mot de passe est obligatoire."
            );
        }

        Utilisateur utilisateur = rechercherUtilisateur(matricule);

        String nomComplet = utilisateur.getNomComplet();

        String contenu =
                "Bonjour " + nomComplet + ",\n\n"
                        + "Votre compte sur la plateforme SPAT a été créé avec succès.\n\n"
                        + "Voici vos identifiants de connexion :\n\n"
                        + "Nom complet : " + nomComplet + "\n"
                        + "Matricule : " + matricule + "\n"
                        + "Mot de passe : " + motDePasse + "\n\n"
                        + "Vous pouvez maintenant vous connecter à la plateforme SPAT.\n\n"
                        + "Pour votre sécurité, nous vous recommandons de modifier "
                        + "votre mot de passe après votre première connexion.\n\n"
                        + "Ne communiquez jamais vos identifiants à une autre personne.\n\n"
                        + "Cordialement,\n"
                        + "Administration SPAT";

        envoyer(
                email,
                "SPAT - Confirmation de création de votre compte",
                contenu,
                "l'utilisateur " + matricule
        );
    }

    // 2. EMAIL AVEC MOT DE PASSE TEMPORAIRE ET LIEN DE MODIFICATION

    public void envoyerEmailReinitialisation(
            String email,
            String nomComplet,
            String matricule,
            String motDePasseTemporaire,
            String lien) {

        verifierAdresseEmail(
                email,
                "L'adresse e-mail de l'utilisateur"
        );

        verifierMatricule(matricule);

        if (!StringUtils.hasText(motDePasseTemporaire)
                || !StringUtils.hasText(lien)) {

            throw new IllegalArgumentException(
                    "Le mot de passe temporaire et le lien sont obligatoires."
            );
        }

        String contenu =
                "Bonjour " + nomComplet + ",\n\n"
                        + "Votre demande de réinitialisation du mot de passe "
                        + "sur la plateforme SPAT a été acceptée par l'administrateur.\n\n"
                        + "Voici vos informations :\n\n"
                        + "Nom complet : " + nomComplet + "\n"
                        + "Matricule : " + matricule + "\n"
                        + "Mot de passe temporaire : "
                        + motDePasseTemporaire + "\n\n"
                        + "Pour modifier votre mot de passe, cliquez sur le lien suivant :\n\n"
                        + lien + "\n\n"
                        + "Ce lien est valable pendant 15 minutes et ne peut être "
                        + "utilisé qu'une seule fois.\n\n"
                        + "Sur la page de modification, saisissez votre ancien "
                        + "mot de passe temporaire, puis votre nouveau mot de passe "
                        + "et sa confirmation.\n\n"
                        + "Pour votre sécurité, ne partagez jamais vos identifiants.\n\n"
                        + "Cordialement,\n"
                        + "Administration SPAT Madagascar";

        envoyer(
                email,
                "SPAT - Modification de votre mot de passe",
                contenu,
                "l'utilisateur " + matricule
        );
    }

    // 3. ANCIENNE METHODE DE REINITIALISATION
    // CONSERVEE POUR COMPATIBILITE

    public void envoyerMotDePasseReinitialise(
            String matricule,
            String motDePasse) {

        verifierMatricule(matricule);

        if (!StringUtils.hasText(motDePasse)) {
            throw new IllegalArgumentException(
                    "Le nouveau mot de passe est obligatoire."
            );
        }

        Utilisateur utilisateur = rechercherUtilisateur(matricule);

        verifierAdresseEmail(
                utilisateur.getEmail(),
                "L'adresse e-mail de l'utilisateur"
        );

        String contenu =
                "Bonjour " + utilisateur.getNomComplet() + ",\n\n"
                        + "Votre demande de réinitialisation de mot de passe "
                        + "sur la plateforme SPAT a été acceptée.\n\n"
                        + "Voici vos informations de connexion :\n\n"
                        + "Matricule : " + matricule + "\n"
                        + "Mot de passe : " + motDePasse + "\n\n"
                        + "Cordialement,\n"
                        + "Administration SPAT";

        envoyer(
                utilisateur.getEmail(),
                "SPAT - Réinitialisation de votre mot de passe",
                contenu,
                "l'utilisateur " + matricule
        );
    }

    // 4. NOTIFIER L'ADMINISTRATEUR D'UNE NOUVELLE DEMANDE

    public void envoyerDemandeReinitialisation(String matricule) {

        verifierMatricule(matricule);

        Utilisateur utilisateur = rechercherUtilisateur(matricule);

        verifierAdresseEmail(
                adresseAdministrateur,
                "L'adresse e-mail de l'administrateur"
        );

        String contenu =
                "Bonjour Administrateur SPAT,\n\n"
                        + "Une nouvelle demande de réinitialisation "
                        + "de mot de passe a été enregistrée.\n\n"
                        + "Matricule : " + utilisateur.getMatricule() + "\n"
                        + "Nom complet : " + utilisateur.getNomComplet() + "\n"
                        + "Statut : EN_ATTENTE\n\n"
                        + "Veuillez consulter le tableau de bord administrateur "
                        + "pour traiter cette demande.\n\n"
                        + "Cordialement,\n"
                        + "Plateforme SPAT";

        envoyer(
                adresseAdministrateur,
                "SPAT - Nouvelle demande de réinitialisation",
                contenu,
                "l'administrateur"
        );
    }

    // 5. NOTIFIER L'UTILISATEUR DU REFUS

    public void envoyerNotificationDemandeRejetee(String matricule) {

        verifierMatricule(matricule);

        Utilisateur utilisateur = rechercherUtilisateur(matricule);

        verifierAdresseEmail(
                utilisateur.getEmail(),
                "L'adresse e-mail de l'utilisateur"
        );

        String contenu =
                "Bonjour " + utilisateur.getNomComplet() + ",\n\n"
                        + "Votre demande de réinitialisation du mot de passe "
                        + "sur la plateforme SPAT n'a pas été acceptée.\n\n"
                        + "Si vous pensez qu'il s'agit d'une erreur, "
                        + "veuillez contacter l'administration SPAT.\n\n"
                        + "Cordialement,\n"
                        + "Administration SPAT";

        envoyer(
                utilisateur.getEmail(),
                "SPAT - Réponse à votre demande de réinitialisation",
                contenu,
                "l'utilisateur " + matricule
        );
    }

    // 6. RECHERCHER UN UTILISATEUR

    private Utilisateur rechercherUtilisateur(String matricule) {

        return utilisateurRepository.findByMatricule(matricule.trim())
                .orElseThrow(() -> new IllegalStateException(
                        "Aucun utilisateur ne correspond à ce matricule."
                ));
    }

    // 7. VERIFIER LE MATRICULE

    private void verifierMatricule(String matricule) {

        if (!StringUtils.hasText(matricule)
                || !matricule.trim().matches("\\d{7}")) {

            throw new IllegalArgumentException(
                    "Le matricule doit contenir exactement 7 chiffres."
            );
        }
    }

    // 8. VERIFIER L'ADRESSE EMAIL

    private void verifierAdresseEmail(String email, String libelle) {

        if (!StringUtils.hasText(email)) {
            throw new IllegalStateException(
                    libelle + " est obligatoire."
            );
        }

        String adresse = email.trim();

        if (!adresse.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException(
                    libelle + " n'est pas valide."
            );
        }
    }

    // 9. ENVOYER L'EMAIL AVEC GMAIL SMTP

    private void envoyer(
            String destinataire,
            String sujet,
            String contenu,
            String destinataireDescription) {

        verifierAdresseEmail(
                adresseExpediteur,
                "L'adresse Gmail expéditrice"
        );

        try {
            SimpleMailMessage message = new SimpleMailMessage();

            message.setFrom(adresseExpediteur.trim());
            message.setTo(destinataire.trim());
            message.setSubject(sujet);
            message.setText(contenu);

            mailSender.send(message);

            log.info(
                    "E-mail envoyé avec succès à {}",
                    destinataireDescription
            );

        } catch (MailException | IllegalArgumentException exception) {

            log.error(
                    "Échec de l'envoi de l'e-mail à {}",
                    destinataireDescription,
                    exception
            );

            throw new IllegalStateException(
                    "L'envoi de l'e-mail a échoué : "
                            + exception.getMessage(),
                    exception
            );
        }
    }
}
