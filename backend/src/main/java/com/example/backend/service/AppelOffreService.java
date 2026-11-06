
package com.example.backend.service;

import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.CategorieMarche;
import com.example.backend.entity.Utilisateur;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.repository.CategorieMarcheRepository;
import com.example.backend.repository.UtilisateurRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class AppelOffreService {

    private final AppelOffreRepository appelOffreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CategorieMarcheRepository categorieMarcheRepository;

    public AppelOffreService(
            AppelOffreRepository appelOffreRepository,
            UtilisateurRepository utilisateurRepository,
            CategorieMarcheRepository categorieMarcheRepository) {

        this.appelOffreRepository = appelOffreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.categorieMarcheRepository = categorieMarcheRepository;
    }

    private ResponseStatusException erreur(
            HttpStatus statut,
            String message) {

        return new ResponseStatusException(statut, message);
    }

    private AppelOffre trouver(Long id) {

        return appelOffreRepository.findById(id)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Appel d'offres introuvable."
                ));
    }

    // Récupérer le responsable connecté

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

    // Générer une référence unique

    private String genererReference() {

        String date = LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        String code = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 8)
                .toUpperCase();

        return "AO-" + date + "-" + code;
    }

    // Récupérer une catégorie active

    private CategorieMarche trouverCategorieActive(AppelOffre appel) {

        if (appel.getCategorieMarche() == null
                || appel.getCategorieMarche().getIdCategorie() == null) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La catégorie du marché est obligatoire."
            );
        }

        Long idCategorie =
                appel.getCategorieMarche().getIdCategorie();

        CategorieMarche categorie = categorieMarcheRepository
                .findById(idCategorie)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Catégorie de marché introuvable."
                ));

        if (!"ACTIF".equalsIgnoreCase(categorie.getStatut())) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Cette catégorie est inactive."
            );
        }

        return categorie;
    }

    // Validation des données

    private void validerDonnees(AppelOffre appel) {

        if (appel == null) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Les données de l'appel d'offres sont obligatoires."
            );
        }

        if (appel.getObjet() == null
                || appel.getObjet().isBlank()) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "L'objet de l'appel d'offres est obligatoire."
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
                    "La date limite de dépôt est obligatoire."
            );
        }

        if (appel.getTypeMarche() == null
                || !(appel.getTypeMarche().equalsIgnoreCase("FOURNITURE")
                || appel.getTypeMarche().equalsIgnoreCase("SERVICE"))) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Le type de marché doit être FOURNITURE ou SERVICE."
            );
        }

        String type = appel.getTypeMarche().trim().toUpperCase();

        if ("FOURNITURE".equals(type)) {

            if (appel.getMontantEstime() == null
                    || appel.getMontantEstime().compareTo(BigDecimal.ZERO) <= 0) {

                throw erreur(
                        HttpStatus.BAD_REQUEST,
                        "Le montant estimé est obligatoire et doit être supérieur à zéro pour un marché de fourniture."
                );
            }

        } else {

            appel.setMontantEstime(null);
        }

        if (appel.getLieuExecution() != null
                && appel.getLieuExecution().length() > 255) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Le lieu d'exécution ne doit pas dépasser 255 caractères."
            );
        }

        appel.setObjet(appel.getObjet().trim());
        appel.setTypeMarche(type);

        if (appel.getDescription() != null
                && appel.getDescription().isBlank()) {

            appel.setDescription(null);
        }

        if (appel.getLieuExecution() != null
                && appel.getLieuExecution().isBlank()) {

            appel.setLieuExecution(null);
        }
    }

    // 1. LISTE COMPLETE

    @Transactional(readOnly = true)
    public List<AppelOffre> obtenirTous() {

        return appelOffreRepository
                .findAllByOrderByIdAppelOffreDesc();
    }

    // 2. DETAIL

    @Transactional(readOnly = true)
    public AppelOffre obtenirParId(Long id) {

        return trouver(id);
    }

    // 3. CREATION

    public AppelOffre creer(AppelOffre appel) {

        validerDonnees(appel);

        Utilisateur responsable = trouverResponsableConnecte();

        CategorieMarche categorie =
                trouverCategorieActive(appel);

        appel.setIdAppelOffre(null);
        appel.setReference(genererReference());
        appel.setCategorieMarche(categorie);
        appel.setUtilisateur(responsable);
        appel.setStatut("BROUILLON");
        appel.setDatePublication(null);

        System.out.println("===== CREATION APPEL OFFRES =====");
        System.out.println("Référence : " + appel.getReference());
        System.out.println("Objet : " + appel.getObjet());
        System.out.println("Type : " + appel.getTypeMarche());
        System.out.println("Montant : " + appel.getMontantEstime());
        System.out.println("Catégorie ID : " + categorie.getIdCategorie());
        System.out.println("Responsable ID : " + responsable.getIdUtilisateur());
        System.out.println("Date limite : " + appel.getDateLimiteDepot());

        try {

            AppelOffre nouvelAppel =
                    appelOffreRepository.saveAndFlush(appel);

            System.out.println("===== ENREGISTREMENT REUSSI =====");
            System.out.println("ID enregistré : "
                    + nouvelAppel.getIdAppelOffre());
            System.out.println("Référence enregistrée : "
                    + nouvelAppel.getReference());

            return nouvelAppel;

        } catch (DataIntegrityViolationException e) {

            System.err.println("===== ERREUR CONTRAINTE BASE DE DONNEES =====");
            e.printStackTrace();

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Impossible d'enregistrer l'appel d'offres : une contrainte de la base de données est violée. Vérifiez la référence, la catégorie, le responsable et les champs obligatoires."
            );
        }
    }

    // 4. MODIFICATION

    public AppelOffre modifier(Long id, AppelOffre donnees) {

        AppelOffre existant = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(existant.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un appel d'offres en BROUILLON peut être modifié."
            );
        }

        validerDonnees(donnees);

        CategorieMarche categorie =
                trouverCategorieActive(donnees);

        existant.setObjet(donnees.getObjet());
        existant.setDescription(donnees.getDescription());
        existant.setTypeMarche(donnees.getTypeMarche());
        existant.setMontantEstime(donnees.getMontantEstime());
        existant.setLieuExecution(donnees.getLieuExecution());
        existant.setDateLimiteDepot(donnees.getDateLimiteDepot());
        existant.setCategorieMarche(categorie);

        return appelOffreRepository.save(existant);
    }

    // 5. PUBLICATION CORRIGEE

    public AppelOffre publier(Long id) {

        System.out.println("===== DEBUT PUBLICATION =====");
        System.out.println("ID appel d'offres : " + id);

        AppelOffre appel = trouver(id);

        // Vérifier le statut

        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un appel d'offres en brouillon peut être publié."
            );
        }

        // Vérifier les données obligatoires

        validerDonnees(appel);

        // Vérifier la catégorie

        CategorieMarche categorie =
                trouverCategorieActive(appel);

        appel.setCategorieMarche(categorie);

        // Vérifier la date limite

        LocalDateTime maintenant = LocalDateTime.now();

        if (appel.getDateLimiteDepot() == null
                || !appel.getDateLimiteDepot().isAfter(maintenant)) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La date limite de dépôt doit être dans le futur."
            );
        }

        // Vérifier le responsable associé

        if (appel.getUtilisateur() == null
                || appel.getUtilisateur().getIdUtilisateur() == null) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Aucun responsable n'est associé à cet appel d'offres."
            );
        }

        // Modifier les informations de publication

        appel.setStatut("PUBLIE");
        appel.setDatePublication(maintenant);

        try {

            AppelOffre publie =
                    appelOffreRepository.saveAndFlush(appel);

            System.out.println("===== PUBLICATION REUSSIE =====");
            System.out.println("ID : " + publie.getIdAppelOffre());
            System.out.println("Référence : " + publie.getReference());
            System.out.println("Statut : " + publie.getStatut());
            System.out.println("Date publication : "
                    + publie.getDatePublication());

            return publie;

        } catch (DataIntegrityViolationException e) {

            System.err.println("===== ERREUR PUBLICATION APPEL OFFRES =====");
            e.printStackTrace();

            throw erreur(
                    HttpStatus.CONFLICT,
                    "La publication a échoué à cause d'une contrainte de la base de données. Vérifiez les champs obligatoires et les contraintes du statut."
            );
        }
    }

    // 6. CLOTURE

    public AppelOffre cloturer(Long id) {

        AppelOffre appel = trouver(id);

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un appel d'offres publié peut être clôturé."
            );
        }

        appel.setStatut("CLOTURE");

        return appelOffreRepository.save(appel);
    }

    // 7. ANNULATION

    public AppelOffre annuler(Long id) {

        AppelOffre appel = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())
                && !"PUBLIE".equalsIgnoreCase(appel.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Cet appel d'offres ne peut plus être annulé."
            );
        }

        appel.setStatut("ANNULE");

        return appelOffreRepository.save(appel);
    }

    // 8. ATTRIBUTION

    public AppelOffre attribuer(Long id) {

        AppelOffre appel = trouver(id);

        if (!"CLOTURE".equalsIgnoreCase(appel.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "L'appel d'offres doit être clôturé avant l'attribution."
            );
        }

        appel.setStatut("ATTRIBUE");

        return appelOffreRepository.save(appel);
    }

    // 9. SUPPRESSION

    public void supprimer(Long id) {

        AppelOffre appel = trouver(id);

        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Seul un brouillon peut être supprimé."
            );
        }

        appelOffreRepository.delete(appel);
    }

    // 10. RECHERCHE ET FILTRAGE

    @Transactional(readOnly = true)
    public List<AppelOffre> rechercher(
            String statut,
            String typeMarche,
            String objet) {

        return obtenirTous().stream()

                .filter(a -> statut == null || statut.isBlank()
                        || statut.equalsIgnoreCase(a.getStatut()))

                .filter(a -> typeMarche == null || typeMarche.isBlank()
                        || typeMarche.equalsIgnoreCase(a.getTypeMarche()))

                .filter(a -> objet == null || objet.isBlank()
                        || (a.getObjet() != null
                        && a.getObjet().toLowerCase()
                        .contains(objet.toLowerCase())))

                .toList();
    }

    // 11. STATISTIQUES

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
                                "PUBLIE",
                                maintenant
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
