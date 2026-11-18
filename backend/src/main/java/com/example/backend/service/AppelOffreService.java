package com.example.backend.service;

import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.AppelOffreCritere;
import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.AppelOffreCritereRepository;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.repository.PieceRequiseRepository;
import com.example.backend.repository.UtilisateurRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AppelOffreService {

    private final AppelOffreRepository appelOffreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final PieceRequiseRepository pieceRepository;
    private final AppelOffreCritereRepository critereRepository;
    private final PhotoAppelOffreService photoService;

    public AppelOffreService(
            AppelOffreRepository appelOffreRepository,
            UtilisateurRepository utilisateurRepository,
            PieceRequiseRepository pieceRepository,
            AppelOffreCritereRepository critereRepository,
            PhotoAppelOffreService photoService) {

        this.appelOffreRepository = appelOffreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.pieceRepository = pieceRepository;
        this.critereRepository = critereRepository;
        this.photoService = photoService;
    }

    private ResponseStatusException erreur(
            HttpStatus statut, String message) {

        return new ResponseStatusException(statut, message);
    }

    private AppelOffre trouver(Long id) {

        return appelOffreRepository.findById(id)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Appel d'offres introuvable."
                ));
    }

    // Responsable connecté
    private Utilisateur trouverResponsableConnecte() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || "anonymousUser".equals(authentication.getPrincipal())) {

            throw erreur(
                    HttpStatus.UNAUTHORIZED,
                    "Vous devez être connecté."
            );
        }

        String matricule = authentication.getPrincipal().toString();

        Utilisateur responsable = utilisateurRepository
                .findByMatricule(matricule)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur connecté introuvable."
                ));

        if (!"RESPONSABLE_MARCHES".equalsIgnoreCase(
                responsable.getRole())) {

            throw erreur(
                    HttpStatus.FORBIDDEN,
                    "Seul un responsable des marchés peut gérer les appels d'offres."
            );
        }

        if (!"ACTIF".equalsIgnoreCase(responsable.getStatut())) {

            throw erreur(
                    HttpStatus.FORBIDDEN,
                    "Votre compte n'est pas actif."
            );
        }

        return responsable;
    }

    // Validation des champs saisis (référence manuelle, objet, date limite, lieu)
    private void validerDonnees(AppelOffre appel) {

        if (appel == null) {
            throw erreur(HttpStatus.BAD_REQUEST, "Données obligatoires.");
        }

        if (appel.getReference() == null
                || appel.getReference().isBlank()) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La référence est obligatoire."
            );
        }

        if (appel.getReference().trim().length() > 50) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La référence ne doit pas dépasser 50 caractères."
            );
        }

        if (appel.getObjet() == null
                || appel.getObjet().isBlank()) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "L'objet est obligatoire."
            );
        }

        if (appel.getObjet().trim().length() > 255) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "L'objet ne doit pas dépasser 255 caractères."
            );
        }

        if (appel.getDateLimiteDepot() == null) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La date limite est obligatoire."
            );
        }

        if (appel.getLieuExecution() != null
                && appel.getLieuExecution().length() > 255) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Lieu d'exécution trop long."
            );
        }

        appel.setReference(appel.getReference().trim());
        appel.setObjet(appel.getObjet().trim());

        if (appel.getDescription() != null
                && appel.getDescription().isBlank()) {
            appel.setDescription(null);
        }

        if (appel.getLieuExecution() != null) {
            String lieu = appel.getLieuExecution().trim();
            appel.setLieuExecution(lieu.isEmpty() ? null : lieu);
        }
    }

    private void verifierDateFuture(AppelOffre appel) {

        if (!appel.getDateLimiteDepot().isAfter(LocalDateTime.now())) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La date limite de dépôt doit être dans le futur."
            );
        }
    }

    // La référence doit être unique (insensible à la casse)
    private void verifierReferenceLibre(String reference, Long idExclu) {

        boolean existe = idExclu == null
                ? appelOffreRepository.existsByReferenceIgnoreCase(reference)
                : appelOffreRepository
                .existsByReferenceIgnoreCaseAndIdAppelOffreNot(
                        reference, idExclu
                );

        if (existe) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Cette référence existe déjà. Choisissez une autre référence."
            );
        }
    }

    // 1. Liste complète
    @Transactional(readOnly = true)
    public List<AppelOffre> obtenirTous() {

        return appelOffreRepository
                .findAllByOrderByIdAppelOffreDesc();
    }

    // 2. Publications accessibles sans authentification
    @Transactional(readOnly = true)
    public List<AppelOffre> obtenirOffresPubliees() {

        return appelOffreRepository
                .findByStatutIgnoreCaseOrderByDatePublicationDesc("PUBLIE");
    }

    // 3. Détail
    @Transactional(readOnly = true)
    public AppelOffre obtenirParId(Long id) {
        return trouver(id);
    }

    // 4. Création
    public AppelOffre creer(AppelOffre appel) {

        validerDonnees(appel);
        verifierDateFuture(appel);

        Utilisateur responsable = trouverResponsableConnecte();

        verifierReferenceLibre(appel.getReference(), null);

        appel.setIdAppelOffre(null);
        appel.setUtilisateur(responsable);
        appel.setStatut("BROUILLON");
        appel.setDatePublication(null);

        try {
            return appelOffreRepository.saveAndFlush(appel);

        } catch (DataIntegrityViolationException e) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Impossible d'enregistrer l'appel d'offres (référence déjà utilisée ou contrainte de la base)."
            );
        }
    }

    // 5. Modification
    public AppelOffre modifier(Long id, AppelOffre donnees) {

        AppelOffre existant = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(existant.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un brouillon peut être modifié."
            );
        }

        validerDonnees(donnees);
        verifierDateFuture(donnees);
        verifierReferenceLibre(donnees.getReference(), id);

        existant.setReference(donnees.getReference());
        existant.setObjet(donnees.getObjet());
        existant.setDescription(donnees.getDescription());
        existant.setLieuExecution(donnees.getLieuExecution());
        existant.setDateLimiteDepot(donnees.getDateLimiteDepot());

        try {
            return appelOffreRepository.saveAndFlush(existant);

        } catch (DataIntegrityViolationException e) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Impossible de modifier l'appel d'offres (référence déjà utilisée ou contrainte de la base)."
            );
        }
    }

    // 6. Publication
    public AppelOffre publier(Long id) {

        AppelOffre appel = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un brouillon peut être publié."
            );
        }

        validerDonnees(appel);

        LocalDateTime maintenant = LocalDateTime.now();

        if (!appel.getDateLimiteDepot().isAfter(maintenant)) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La date limite doit être dans le futur."
            );
        }

        if (pieceRepository.countByAppelOffre_IdAppelOffre(id) == 0) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Ajoutez au moins une pièce requise avant de publier."
            );
        }

        if (appel.getUtilisateur() == null
                || appel.getUtilisateur().getIdUtilisateur() == null) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Aucun responsable n'est associé à cet appel."
            );
        }

        appel.setStatut("PUBLIE");
        appel.setDatePublication(maintenant);

        try {
            return appelOffreRepository.saveAndFlush(appel);

        } catch (DataIntegrityViolationException e) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Erreur de contrainte lors de la publication."
            );
        }
    }

    // 7. Clôture
    public AppelOffre cloturer(Long id) {

        AppelOffre appel = trouver(id);

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un appel publié peut être clôturé."
            );
        }

        appel.setStatut("CLOTURE");

        return appelOffreRepository.save(appel);
    }

    // 8. Annulation
    public AppelOffre annuler(Long id) {

        AppelOffre appel = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())
                && !"PUBLIE".equalsIgnoreCase(appel.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Cet appel ne peut plus être annulé."
            );
        }

        appel.setStatut("ANNULE");

        return appelOffreRepository.save(appel);
    }

    // 9. Attribution
    public AppelOffre attribuer(Long id) {

        AppelOffre appel = trouver(id);

        if (!"CLOTURE".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "L'appel doit être clôturé avant attribution."
            );
        }

        appel.setStatut("ATTRIBUE");

        return appelOffreRepository.save(appel);
    }

    // 10. Suppression (brouillon uniquement) : pièces, anciens critères et photos
    //     sont supprimés avec l'appel pour ne pas bloquer sur les clés étrangères.
    public void supprimer(Long id) {

        AppelOffre appel = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un brouillon peut être supprimé."
            );
        }

        pieceRepository.deleteByAppelOffre_IdAppelOffre(id);

        List<AppelOffreCritere> anciensCriteres =
                critereRepository.findByAppelOffre_IdAppelOffre(id);
        critereRepository.deleteAll(anciensCriteres);

        photoService.supprimerToutes(id);

        appelOffreRepository.delete(appel);
    }

    // 11. Recherche
    @Transactional(readOnly = true)
    public List<AppelOffre> rechercher(String statut, String objet) {

        return obtenirTous().stream()

                .filter(a -> statut == null || statut.isBlank()
                        || statut.equalsIgnoreCase(a.getStatut()))

                .filter(a -> objet == null || objet.isBlank()
                        || (a.getObjet() != null
                        && a.getObjet().toLowerCase()
                        .contains(objet.toLowerCase())))

                .toList();
    }

    // 12. Statistiques
    @Transactional(readOnly = true)
    public Map<String, Object> obtenirStatistiques() {

        LocalDateTime maintenant = LocalDateTime.now();

        long total = appelOffreRepository.count();

        long brouillons =
                appelOffreRepository.countByStatutIgnoreCase("BROUILLON");

        long publies =
                appelOffreRepository.countByStatutIgnoreCase("PUBLIE");

        long clotures =
                appelOffreRepository.countByStatutIgnoreCase("CLOTURE");

        long annules =
                appelOffreRepository.countByStatutIgnoreCase("ANNULE");

        long attribues =
                appelOffreRepository.countByStatutIgnoreCase("ATTRIBUE");

        long enRetard =
                appelOffreRepository
                        .countByStatutIgnoreCaseAndDateLimiteDepotBefore(
                                "PUBLIE", maintenant
                        );

        Map<String, Object> statistiques = new LinkedHashMap<>();

        statistiques.put("totalAppelsOffres", total);
        statistiques.put("brouillons", brouillons);
        statistiques.put("publies", publies);
        statistiques.put("clotures", clotures);
        statistiques.put("annules", annules);
        statistiques.put("attribues", attribues);
        statistiques.put("enRetard", enRetard);
        statistiques.put("dateActualisation", maintenant);

        return statistiques;
    }
}
