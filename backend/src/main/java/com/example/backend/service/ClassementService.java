package com.example.backend.service;

import com.example.backend.entity.Offre;
import com.example.backend.entity.Utilisateur;
import com.example.backend.entity.ValidationAttribution;
import com.example.backend.repository.OffreRepository;
import com.example.backend.repository.UtilisateurRepository;
import com.example.backend.repository.ValidationAttributionRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utilise la table validation_attribution (decision limitée à VALIDE / REFUSE) :
 *  - niveau 1 : offre retenue et transmise par l'évaluateur
 *  - niveau 2 : résultat publié par le Responsable des marchés
 */
@Service
public class ClassementService {

    public static final int NIVEAU_EVALUATEUR = 1;
    public static final int NIVEAU_PUBLICATION = 2;
    public static final String DECISION_VALIDE = "VALIDE";

    private static final Pattern RANG_NOTE =
            Pattern.compile("Rang (\\d+) - Note ([\\d.]+)");

    private final OffreRepository offreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ValidationAttributionRepository validationRepository;

    public ClassementService(
            OffreRepository offreRepository,
            UtilisateurRepository utilisateurRepository,
            ValidationAttributionRepository validationRepository
    ) {
        this.offreRepository = offreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.validationRepository = validationRepository;
    }

    public static class LigneClassement {
        public Long idOffre;
        public Integer rang;
        public BigDecimal note;
    }

    public static class TransmissionRequest {
        public Long idAppelOffre;
        public List<LigneClassement> classement;
    }

    private Utilisateur utilisateurConnecte() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur non connecté.");
        }
        return utilisateurRepository.findByMatricule(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Utilisateur introuvable."));
    }

    private ValidationAttribution ligne(int niveau, String commentaire, Offre offre, Utilisateur u) {
        ValidationAttribution v = new ValidationAttribution();
        v.setNiveau(niveau);
        v.setDecision(DECISION_VALIDE);
        v.setCommentaire(commentaire);
        v.setOffre(offre);
        v.setUtilisateur(u);
        return v;
    }

    // =====================================================
    // EVALUATEUR : transmettre les offres retenues d'UN appel
    // =====================================================

    @Transactional
    public int transmettre(TransmissionRequest req) {
        if (req == null || req.idAppelOffre == null
                || req.classement == null || req.classement.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Sélectionnez au moins une offre à transmettre.");
        }

        Utilisateur evaluateur = utilisateurConnecte();

        List<Long> ids = new ArrayList<>();
        for (LigneClassement l : req.classement) {
            if (l == null || l.idOffre == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Offre invalide.");
            }
            if (ids.contains(l.idOffre)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Offre en double.");
            }
            ids.add(l.idOffre);
        }

        if (validationRepository.existsByOffre_IdOffreInAndNiveau(ids, NIVEAU_EVALUATEUR)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Une de ces offres a déjà été transmise au Responsable des marchés.");
        }

        List<ValidationAttribution> aEnregistrer = new ArrayList<>();
        for (LigneClassement l : req.classement) {
            Offre offre = offreRepository.findById(l.idOffre)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Offre introuvable : " + l.idOffre));

            if (offre.getAppelOffre() == null
                    || !req.idAppelOffre.equals(offre.getAppelOffre().getIdAppelOffre())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "L'offre " + l.idOffre + " n'appartient pas à cet appel d'offres.");
            }

            aEnregistrer.add(ligne(NIVEAU_EVALUATEUR,
                    "Rang " + l.rang + " - Note " + l.note + "/20", offre, evaluateur));
        }

        validationRepository.saveAll(aEnregistrer);
        return aEnregistrer.size();
    }

    public List<Long> appelsTransmis() {
        return validationRepository.findAppelsTransmis();
    }

    // =====================================================
    // RESPONSABLE DES MARCHES
    // =====================================================

    @Transactional
    public List<Map<String, Object>> recus() {
        Set<Long> publies = new HashSet<>();
        for (ValidationAttribution v : validationRepository.findByNiveau(NIVEAU_PUBLICATION)) {
            if (v.getOffre() != null) publies.add(v.getOffre().getIdOffre());
        }

        Map<Long, Map<String, Object>> parAppel = new LinkedHashMap<>();

        for (ValidationAttribution v : validationRepository
                .findByNiveauOrderByOffre_AppelOffre_IdAppelOffreAscIdValidationAsc(NIVEAU_EVALUATEUR)) {
            Offre o = v.getOffre();
            Long idAppel = o.getAppelOffre().getIdAppelOffre();

            Map<String, Object> groupe = parAppel.computeIfAbsent(idAppel, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("idAppelOffre", idAppel);
                m.put("reference", o.getAppelOffre().getReference());
                m.put("objet", o.getAppelOffre().getObjet());
                m.put("publie", true);
                m.put("soumissionnaires", new ArrayList<Map<String, Object>>());
                return m;
            });

            Integer rang = null;
            BigDecimal note = null;
            Matcher m = RANG_NOTE.matcher(v.getCommentaire() == null ? "" : v.getCommentaire());
            if (m.find()) {
                rang = Integer.valueOf(m.group(1));
                note = new BigDecimal(m.group(2));
            }

            boolean estPublie = publies.contains(o.getIdOffre());
            if (!estPublie) groupe.put("publie", false);

            Map<String, Object> ligne = new LinkedHashMap<>();
            ligne.put("idOffre", o.getIdOffre());
            ligne.put("nom", o.getEntreprise() != null && !o.getEntreprise().isBlank()
                    ? o.getEntreprise() : o.getNomSoumissionnaire());
            ligne.put("rang", rang);
            ligne.put("note", note);
            ligne.put("decision", estPublie ? "PUBLIE" : "EN_ATTENTE");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> liste = (List<Map<String, Object>>) groupe.get("soumissionnaires");
            liste.add(ligne);
        }
        return new ArrayList<>(parAppel.values());
    }

    @Transactional
    public int publier(Long idAppelOffre) {
        List<ValidationAttribution> transmises = validationRepository
                .findByNiveauAndOffre_AppelOffre_IdAppelOffre(NIVEAU_EVALUATEUR, idAppelOffre);

        if (transmises.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Aucun soumissionnaire transmis pour cet appel d'offres.");
        }

        Set<Long> dejaPublies = new HashSet<>();
        for (ValidationAttribution v : validationRepository
                .findByNiveauAndOffre_AppelOffre_IdAppelOffre(NIVEAU_PUBLICATION, idAppelOffre)) {
            dejaPublies.add(v.getOffre().getIdOffre());
        }

        Utilisateur responsable = utilisateurConnecte();
        List<ValidationAttribution> nouvelles = new ArrayList<>();

        for (ValidationAttribution t : transmises) {
            Offre o = t.getOffre();
            if (!dejaPublies.contains(o.getIdOffre())) {
                nouvelles.add(ligne(NIVEAU_PUBLICATION, "Résultat publié", o, responsable));
            }
        }

        if (nouvelles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Déjà publié.");
        }

        validationRepository.saveAll(nouvelles);
        return nouvelles.size();
    }
}
