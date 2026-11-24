package com.example.backend.service;

import com.example.backend.entity.Contrat;
import com.example.backend.entity.Offre;
import com.example.backend.entity.Utilisateur;
import com.example.backend.entity.ValidationAttribution;
import com.example.backend.repository.ContratRepository;
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
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Contrats des soumissionnaires dont le résultat a été publié (niveau 2).
 * Deux familles de contrats :
 *  - FOURNISSEUR : contrat de fourniture (entreprise)
 *  - PRESTATAIRE : contrat de prestation de services (personne physique)
 */
@Service
public class ContratService {

    public static final String TYPE_FOURNISSEUR = "FOURNISSEUR";
    public static final String TYPE_PRESTATAIRE = "PRESTATAIRE";

    public static final String UNITE_JOUR = "JOUR";
    public static final String UNITE_MOIS = "MOIS";
    public static final String UNITE_ANNEE = "ANNEE";

    public static final String STATUT_BROUILLON = "BROUILLON";
    public static final String STATUT_SIGNE = "SIGNE";

    private static final Pattern RANG_NOTE =
            Pattern.compile("Rang (\\d+) - Note ([\\d.]+)");

    private final ContratRepository contratRepository;
    private final OffreRepository offreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ValidationAttributionRepository validationRepository;

    public ContratService(
            ContratRepository contratRepository,
            OffreRepository offreRepository,
            UtilisateurRepository utilisateurRepository,
            ValidationAttributionRepository validationRepository
    ) {
        this.contratRepository = contratRepository;
        this.offreRepository = offreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.validationRepository = validationRepository;
    }

    // Corps de la requête (création et modification)
    public static class ContratRequest {
        public String objet;
        public BigDecimal montant;
        public Integer delaiValeur;
        // JOUR, MOIS ou ANNEE
        public String delaiUnite;
        public LocalDate dateDebut;
        public String lieuExecution;
        public String clauses;
    }

    // =====================================================
    // OUTILS
    // =====================================================

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

    private static String texte(String valeur) {
        if (valeur == null) return null;
        String t = valeur.trim();
        return t.isEmpty() ? null : t;
    }

    // Accepte JOUR / MOIS / ANNEE (avec ou sans accent, singulier ou pluriel)
    private static String normaliserUnite(String valeur) {
        String u = valeur == null ? "" : valeur.trim().toUpperCase()
                .replace("É", "E").replace("È", "E");

        if (u.equals("JOUR") || u.equals("JOURS")) return UNITE_JOUR;
        if (u.equals("MOIS")) return UNITE_MOIS;
        if (u.equals("ANNEE") || u.equals("ANNEES") || u.equals("AN") || u.equals("ANS")) {
            return UNITE_ANNEE;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unité de délai invalide : choisissez jour, mois ou année.");
    }

    private static String typeDe(Offre o) {
        String t = o.getTypeSoumissionnaire() == null
                ? "" : o.getTypeSoumissionnaire().trim().toUpperCase();
        if (!TYPE_FOURNISSEUR.equals(t) && !TYPE_PRESTATAIRE.equals(t)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Type de soumissionnaire invalide pour l'offre " + o.getIdOffre() + ".");
        }
        return t;
    }

    private void valider(ContratRequest r) {
        if (r == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Données du contrat manquantes.");
        }
        if (r.montant == null || r.montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le montant du contrat doit être supérieur à 0.");
        }
        if (r.montant.compareTo(new BigDecimal("9999999999999999.99")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Montant trop élevé.");
        }
        if (r.delaiValeur == null || r.delaiValeur <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le délai d'exécution doit être supérieur à 0.");
        }

        String unite = normaliserUnite(r.delaiUnite);
        int max = switch (unite) {
            case UNITE_JOUR -> 36500;
            case UNITE_MOIS -> 1200;
            default -> 99;
        };
        if (r.delaiValeur > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Délai d'exécution trop élevé pour l'unité choisie.");
        }
        if (texte(r.lieuExecution) != null && r.lieuExecution.trim().length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le lieu d'exécution dépasse 255 caractères.");
        }
    }

    private void appliquer(Contrat c, ContratRequest r, Offre offre) {
        String objet = texte(r.objet);
        if (objet == null) objet = offre.getAppelOffre().getObjet();

        c.setObjet(objet);
        c.setMontant(r.montant.setScale(2, java.math.RoundingMode.HALF_UP));
        c.setDelaiValeur(r.delaiValeur);
        c.setDelaiUnite(normaliserUnite(r.delaiUnite));
        c.setDateDebut(r.dateDebut);
        c.setLieuExecution(texte(r.lieuExecution));
        c.setClauses(texte(r.clauses));
    }

    private Contrat charger(Long id) {
        return contratRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Contrat introuvable."));
    }

    // =====================================================
    // LECTURE : colonnes Fournisseur / Prestataire par appel
    // =====================================================

    @Transactional
    public List<Map<String, Object>> liste() {
        // Rang et note saisis par l'évaluateur (niveau 1)
        Map<Long, String> commentaires = new HashMap<>();
        for (ValidationAttribution v : validationRepository.findByNiveau(ClassementService.NIVEAU_EVALUATEUR)) {
            if (v.getOffre() != null) {
                commentaires.put(v.getOffre().getIdOffre(), v.getCommentaire());
            }
        }

        Map<Long, Contrat> contrats = new HashMap<>();
        for (Contrat c : contratRepository.findAll()) {
            contrats.put(c.getOffre().getIdOffre(), c);
        }

        Map<Long, Map<String, Object>> parAppel = new LinkedHashMap<>();
        Set<Long> dejaVus = new HashSet<>();

        for (ValidationAttribution v : validationRepository
                .findByNiveauOrderByOffre_AppelOffre_IdAppelOffreAscIdValidationAsc(
                        ClassementService.NIVEAU_PUBLICATION)) {

            Offre o = v.getOffre();
            if (o == null || !dejaVus.add(o.getIdOffre())) continue;

            Long idAppel = o.getAppelOffre().getIdAppelOffre();

            Map<String, Object> groupe = parAppel.computeIfAbsent(idAppel, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("idAppelOffre", idAppel);
                m.put("reference", o.getAppelOffre().getReference());
                m.put("objet", o.getAppelOffre().getObjet());
                m.put("lieuExecution", o.getAppelOffre().getLieuExecution());
                m.put("fournisseurs", new ArrayList<Map<String, Object>>());
                m.put("prestataires", new ArrayList<Map<String, Object>>());
                return m;
            });

            String type = typeDe(o);
            boolean fournisseur = TYPE_FOURNISSEUR.equals(type);

            Integer rang = null;
            BigDecimal note = null;
            String commentaire = commentaires.get(o.getIdOffre());
            Matcher m = RANG_NOTE.matcher(commentaire == null ? "" : commentaire);
            if (m.find()) {
                rang = Integer.valueOf(m.group(1));
                note = new BigDecimal(m.group(2));
            }

            Map<String, Object> ligne = new LinkedHashMap<>();
            ligne.put("idOffre", o.getIdOffre());
            ligne.put("accuseDeReception", o.getAccuseDeReception());
            ligne.put("type", type);
            ligne.put("rang", rang);
            ligne.put("note", note);

            // Identité de la partie contractante
            ligne.put("nom", fournisseur
                    ? o.getEntreprise() : o.getNomSoumissionnaire());
            ligne.put("adresse", fournisseur
                    ? o.getAdresseEntreprise() : o.getAdresseSoumissionnaire());
            ligne.put("nif", fournisseur ? o.getNif() : null);
            ligne.put("stat", fournisseur ? o.getStat() : null);
            ligne.put("email", o.getEmailSoumissionnaire());
            ligne.put("telephone", o.getTelephoneSoumissionnaire());

            Contrat c = contrats.get(o.getIdOffre());
            ligne.put("contrat", c == null ? null : versMap(c));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cible = (List<Map<String, Object>>)
                    groupe.get(fournisseur ? "fournisseurs" : "prestataires");
            cible.add(ligne);
        }

        // Tri de chaque colonne par rang
        for (Map<String, Object> g : parAppel.values()) {
            for (String cle : List.of("fournisseurs", "prestataires")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> l = (List<Map<String, Object>>) g.get(cle);
                l.sort(Comparator.comparing(
                        (Map<String, Object> x) -> (Integer) x.get("rang"),
                        Comparator.nullsLast(Comparator.naturalOrder())));
            }
        }

        return new ArrayList<>(parAppel.values());
    }

    // =====================================================
    // CRÉATION / MODIFICATION / SIGNATURE / SUPPRESSION
    // =====================================================

    @Transactional
    public Map<String, Object> creer(Long idOffre, ContratRequest req) {
        valider(req);

        Offre offre = offreRepository.findById(idOffre)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Offre introuvable."));

        boolean publie = validationRepository
                .existsByOffre_IdOffreInAndNiveau(List.of(idOffre), ClassementService.NIVEAU_PUBLICATION);
        if (!publie) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Le résultat de ce soumissionnaire n'a pas encore été publié.");
        }

        if (contratRepository.existsByOffre_IdOffre(idOffre)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un contrat existe déjà pour ce soumissionnaire.");
        }

        Contrat c = new Contrat();
        c.setOffre(offre);
        c.setTypeContrat(typeDe(offre));
        c.setStatut(STATUT_BROUILLON);
        c.setUtilisateur(utilisateurConnecte());
        c.setNumero("TMP-" + UUID.randomUUID().toString().substring(0, 20));
        appliquer(c, req, offre);

        c = contratRepository.saveAndFlush(c);

        // Numéro définitif basé sur l'identifiant : CT-F-2026-0007 / CT-P-2026-0008
        String prefixe = TYPE_FOURNISSEUR.equals(c.getTypeContrat()) ? "F" : "P";
        c.setNumero(String.format("CT-%s-%d-%04d", prefixe, LocalDate.now().getYear(), c.getIdContrat()));

        return versMap(contratRepository.save(c));
    }

    @Transactional
    public Map<String, Object> modifier(Long idContrat, ContratRequest req) {
        valider(req);

        Contrat c = charger(idContrat);
        if (STATUT_SIGNE.equals(c.getStatut())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un contrat signé ne peut plus être modifié.");
        }

        appliquer(c, req, c.getOffre());
        return versMap(contratRepository.save(c));
    }

    @Transactional
    public Map<String, Object> signer(Long idContrat) {
        Contrat c = charger(idContrat);
        if (STATUT_SIGNE.equals(c.getStatut())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Contrat déjà signé.");
        }

        c.setStatut(STATUT_SIGNE);
        c.setDateSignature(LocalDate.now());
        return versMap(contratRepository.save(c));
    }

    @Transactional
    public void supprimer(Long idContrat) {
        Contrat c = charger(idContrat);
        if (STATUT_SIGNE.equals(c.getStatut())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un contrat signé ne peut pas être supprimé.");
        }
        contratRepository.delete(c);
    }

    // =====================================================
    // SÉRIALISATION
    // =====================================================

    private Map<String, Object> versMap(Contrat c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idContrat", c.getIdContrat());
        m.put("numero", c.getNumero());
        m.put("type", c.getTypeContrat());
        m.put("statut", c.getStatut());
        m.put("objet", c.getObjet());
        m.put("montant", c.getMontant());
        m.put("delaiValeur", c.getDelaiValeur());
        m.put("delaiUnite", c.getDelaiUnite());
        m.put("dateDebut", c.getDateDebut() == null ? null : c.getDateDebut().toString());
        m.put("dateSignature", c.getDateSignature() == null ? null : c.getDateSignature().toString());
        m.put("lieuExecution", c.getLieuExecution());
        m.put("clauses", c.getClauses());
        m.put("dateCreation", c.getDateCreation() == null ? null : c.getDateCreation().toString());
        m.put("idOffre", c.getOffre().getIdOffre());
        return m;
    }
}
