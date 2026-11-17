
package com.example.backend.service;

import com.example.backend.dto.UtilisateurDTO.CreationRequest;
import com.example.backend.dto.UtilisateurDTO.ModificationRequest;
import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.UtilisateurRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
public class UtilisateurService {

    // 1. ROLES AUTORISES
    private static final List<String> ROLES = List.of(
            "ADMINISTRATEUR",
            "RESPONSABLE_MARCHES",
            "EVALUATEUR"
    );

    // 2. STATUTS AUTORISES
    private static final List<String> STATUTS = List.of(
            "ACTIF",
            "SUSPENDU"
    );

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private static final String CARACTERES_MOT_DE_PASSE =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
                    + "23456789@#$%";

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailNotificationService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    public UtilisateurService(
            UtilisateurRepository utilisateurRepository,
            PasswordEncoder passwordEncoder,
            EmailNotificationService emailService) {

        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // 3. OBTENIR TOUS LES UTILISATEURS

    @Transactional(readOnly = true)
    public List<Utilisateur> obtenirTous() {

        return utilisateurRepository.findAll();
    }

    // 4. OBTENIR UN UTILISATEUR PAR ID

    @Transactional(readOnly = true)
    public Utilisateur obtenirParId(Long id) {

        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                ));
    }

    // 5. CREER UN UTILISATEUR

    @Transactional
    public Utilisateur creer(CreationRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de l'utilisateur sont obligatoires."
            );
        }

        String matricule = nettoyer(request.matricule());
        String nomComplet = nettoyer(request.nomComplet());
        String email = nettoyer(request.email());
        String role = normaliser(request.role());
        String departement = nettoyer(request.departement());

        verifierMatricule(matricule);
        verifierNom(nomComplet);
        verifierEmail(email);
        verifierRole(role);
        verifierDepartement(departement);

        if (matriculeExiste(matricule)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce matricule existe déjà."
            );
        }

        if (emailExiste(email, null)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette adresse e-mail est déjà utilisée."
            );
        }

        String motDePasseTemporaire =
                genererMotDePasseTemporaire();

        Utilisateur utilisateur = new Utilisateur();

        utilisateur.setMatricule(matricule);
        utilisateur.setNomComplet(nomComplet);
        utilisateur.setEmail(email);
        utilisateur.setRole(role);
        utilisateur.setDepartement(departement);

        utilisateur.setMotDePasse(
                passwordEncoder.encode(motDePasseTemporaire)
        );

        utilisateur.setStatut("ACTIF");

        Utilisateur utilisateurEnregistre =
                utilisateurRepository.saveAndFlush(utilisateur);

        // Envoyer les identifiants par Gmail
        emailService.envoyerIdentifiants(
                email,
                matricule,
                motDePasseTemporaire
        );

        return utilisateurEnregistre;
    }

    // 6. MODIFIER UN UTILISATEUR

    @Transactional
    public Utilisateur modifier(
            Long id,
            ModificationRequest request) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de modification sont obligatoires."
            );
        }

        Utilisateur utilisateur = obtenirParId(id);

        String nomComplet = nettoyer(request.nomComplet());
        String email = nettoyer(request.email());
        String role = normaliser(request.role());
        String departement = nettoyer(request.departement());

        verifierNom(nomComplet);
        verifierEmail(email);
        verifierRole(role);
        verifierDepartement(departement);

        if (emailExiste(email, id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette adresse e-mail est déjà utilisée."
            );
        }

        utilisateur.setNomComplet(nomComplet);
        utilisateur.setEmail(email);
        utilisateur.setRole(role);
        utilisateur.setDepartement(departement);

        return utilisateurRepository.save(utilisateur);
    }

    // 7. CHANGER LE STATUT D'UN UTILISATEUR

    @Transactional
    public Utilisateur changerStatut(
            Long id,
            String nouveauStatut) {

        Utilisateur utilisateur = obtenirParId(id);

        String statut = normaliser(nouveauStatut);

        if (!STATUTS.contains(statut)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le statut doit être ACTIF ou SUSPENDU."
            );
        }

        utilisateur.setStatut(statut);

        return utilisateurRepository.save(utilisateur);
    }

    // 8. SUPPRIMER DEFINITIVEMENT UN UTILISATEUR

    @Transactional
    public void supprimer(Long id) {

        Utilisateur utilisateur = obtenirParId(id);

        try {

            utilisateurRepository.delete(utilisateur);

            // Forcer l'exécution SQL pour détecter
            // immédiatement les contraintes de clés étrangères.
            utilisateurRepository.flush();

        } catch (DataIntegrityViolationException e) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de supprimer cet utilisateur : "
                            + "il est encore lié à des offres ou à "
                            + "d'autres données enregistrées. "
                            + "Conservez son historique ou réaffectez "
                            + "les données avant sa suppression."
            );
        }
    }

    // 9. REINITIALISER LE MOT DE PASSE

    @Transactional
    public void reinitialiserMotDePasse(String matricule) {

        matricule = nettoyer(matricule);

        verifierMatricule(matricule);

        Utilisateur utilisateur = utilisateurRepository
                .findByMatricule(matricule)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Aucun utilisateur ne correspond à ce matricule."
                ));

        verifierEmail(utilisateur.getEmail());

        String nouveauMotDePasse =
                genererMotDePasseTemporaire();

        utilisateur.setMotDePasse(
                passwordEncoder.encode(nouveauMotDePasse)
        );

        utilisateurRepository.saveAndFlush(utilisateur);

        emailService.envoyerIdentifiants(
                utilisateur.getEmail(),
                utilisateur.getMatricule(),
                nouveauMotDePasse
        );
    }

    // 10. GENERER UN MOT DE PASSE TEMPORAIRE

    private String genererMotDePasseTemporaire() {

        StringBuilder motDePasse = new StringBuilder();

        for (int i = 0; i < 14; i++) {

            int index = secureRandom.nextInt(
                    CARACTERES_MOT_DE_PASSE.length()
            );

            motDePasse.append(
                    CARACTERES_MOT_DE_PASSE.charAt(index)
            );
        }

        return motDePasse.toString();
    }

    // 11. VERIFIER LE MATRICULE

    private void verifierMatricule(String matricule) {

        if (!StringUtils.hasText(matricule)
                || !matricule.matches("\\d{7}")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le matricule doit contenir exactement 7 chiffres."
            );
        }
    }

    // 12. VERIFIER LE NOM

    private void verifierNom(String nom) {

        if (!StringUtils.hasText(nom)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom complet est obligatoire."
            );
        }
    }

    // 13. VERIFIER L'EMAIL

    private void verifierEmail(String email) {

        if (!StringUtils.hasText(email)
                || !EMAIL_PATTERN.matcher(email.trim()).matches()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "L'adresse e-mail est obligatoire et doit être valide."
            );
        }
    }

    // 14. VERIFIER LE ROLE

    private void verifierRole(String role) {

        if (!ROLES.contains(role)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rôle invalide. Les rôles autorisés sont : "
                            + "ADMINISTRATEUR, RESPONSABLE_MARCHES, "
                            + "EVALUATEUR."
            );
        }
    }

    // 15. VERIFIER LE DEPARTEMENT

    private void verifierDepartement(String departement) {

        if (!StringUtils.hasText(departement)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le département est obligatoire."
            );
        }
    }

    // 16. VERIFIER SI LE MATRICULE EXISTE

    private boolean matriculeExiste(String matricule) {

        return utilisateurRepository.existsByMatricule(matricule);
    }

    // 17. VERIFIER SI L'EMAIL EST DEJA UTILISE

    private boolean emailExiste(String email, Long idExclu) {

        return utilisateurRepository.findAll()
                .stream()
                .anyMatch(utilisateur ->
                        utilisateur.getEmail() != null
                                && utilisateur.getEmail()
                                .equalsIgnoreCase(email.trim())
                                && !Objects.equals(
                                utilisateur.getIdUtilisateur(),
                                idExclu
                        )
                );
    }

    // 18. NETTOYER UNE VALEUR

    private String nettoyer(String valeur) {

        return valeur == null ? null : valeur.trim();
    }

    // 19. NORMALISER UNE VALEUR

    private String normaliser(String valeur) {

        return valeur == null
                ? ""
                : valeur.trim().toUpperCase(Locale.ROOT);
    }
}
