
package com.example.backend.controller;

import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.AppelOffreCritere;
import com.example.backend.entity.CritereEvaluation;
import com.example.backend.repository.AppelOffreCritereRepository;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.repository.CritereEvaluationRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/appel-offre-criteres")
public class AppelOffreCritereController {

    // Total maximal des critères : 20 points
    private static final BigDecimal TOTAL = new BigDecimal("20");

    // Statuts visibles par l'évaluateur
    private static final Set<String> STATUTS_EVALUATEUR =
            Set.of("PUBLIE", "CLOTURE", "ATTRIBUE");

    private final AppelOffreCritereRepository repository;
    private final AppelOffreRepository appelOffreRepository;
    private final CritereEvaluationRepository critereRepository;

    public AppelOffreCritereController(
            AppelOffreCritereRepository repository,
            AppelOffreRepository appelOffreRepository,
            CritereEvaluationRepository critereRepository
    ) {
        this.repository = repository;
        this.appelOffreRepository = appelOffreRepository;
        this.critereRepository = critereRepository;
    }

    // =====================================================
    // CONSULTATION DES CRITERES
    // =====================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('RESPONSABLE_MARCHES','EVALUATEUR')")
    public ResponseEntity<List<AppelOffreCritereDto>> lister(
            Authentication authentication
    ) {
        List<AppelOffreCritereDto> resultat = repository.findAll()
                .stream()
                .filter(a -> visible(a, authentication))
                .map(this::convertirEnDto)
                .toList();

        return ResponseEntity.ok(resultat);
    }

    @GetMapping("/appel/{idAppelOffre}")
    @PreAuthorize("hasAnyRole('RESPONSABLE_MARCHES','EVALUATEUR')")
    public ResponseEntity<List<AppelOffreCritereDto>> listerParAppel(
            @PathVariable Long idAppelOffre,
            Authentication authentication
    ) {
        List<AppelOffreCritereDto> resultat =
                repository.findByAppelOffre_IdAppelOffre(idAppelOffre)
                        .stream()
                        .filter(a -> visible(a, authentication))
                        .map(this::convertirEnDto)
                        .toList();

        return ResponseEntity.ok(resultat);
    }

    // =====================================================
    // CREER UN NOUVEAU CRITERE POUR UN APPEL PUBLIE
    // =====================================================

    @PostMapping("/creer")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @Transactional
    public ResponseEntity<AppelOffreCritereDto> creerPourAppel(
            @RequestBody CritereAppelRequest request
    ) {

        if (request.getIdAppelOffre() == null
                || request.getNomCritere() == null
                || request.getNomCritere().isBlank()) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "L'appel d'offres et le nom du critère sont obligatoires."
            );
        }

        validerPonderation(request.getPonderation());

        AppelOffre appel = trouverAppel(request.getIdAppelOffre());

        // IMPORTANT : les critères sont créés uniquement après publication
        verifierPublie(appel);

        verifierTotal(
                appel.getIdAppelOffre(),
                null,
                request.getPonderation()
        );

        CritereEvaluation critere = new CritereEvaluation();
        critere.setNomCritere(request.getNomCritere().trim());
        critere.setDescription(request.getDescription());
        critere.setPonderation(request.getPonderation());

        critere = critereRepository.save(critere);

        AppelOffreCritere association = new AppelOffreCritere();
        association.setAppelOffre(appel);
        association.setCritere(critere);
        association.setPonderation(request.getPonderation());

        AppelOffreCritere sauvegarde = repository.save(association);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(convertirEnDto(sauvegarde));
    }

    // =====================================================
    // ASSOCIER UN CRITERE EXISTANT
    // =====================================================

    @PostMapping
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @Transactional
    public ResponseEntity<AppelOffreCritereDto> ajouter(
            @RequestBody AppelOffreCritereRequest request
    ) {

        AppelOffreCritere entity = preparer(request, null);

        AppelOffreCritere sauvegarde = repository.save(entity);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(convertirEnDto(sauvegarde));
    }

    // =====================================================
    // MODIFIER UN CRITERE
    // =====================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @Transactional
    public ResponseEntity<AppelOffreCritereDto> modifier(
            @PathVariable Long id,
            @RequestBody AppelOffreCritereRequest request
    ) {

        AppelOffreCritere existant = repository.findById(id)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Association appel d'offres / critère introuvable."
                ));

        verifierPublie(existant.getAppelOffre());

        // Conserver les identifiants existants s'ils ne sont pas envoyés
        if (request.getIdAppelOffre() == null) {
            request.setIdAppelOffre(
                    existant.getAppelOffre().getIdAppelOffre()
            );
        }

        if (request.getIdCritere() == null) {
            request.setIdCritere(
                    existant.getCritere().getIdCritere()
            );
        }

        AppelOffreCritere donnees = preparer(request, id);

        existant.setAppelOffre(donnees.getAppelOffre());
        existant.setCritere(donnees.getCritere());
        existant.setPonderation(donnees.getPonderation());

        CritereEvaluation critere = existant.getCritere();

        if (request.getNomCritere() != null
                && !request.getNomCritere().isBlank()) {
            critere.setNomCritere(request.getNomCritere().trim());
        }

        if (request.getDescription() != null) {
            critere.setDescription(request.getDescription());
        }

        critere.setPonderation(donnees.getPonderation());

        critereRepository.save(critere);

        return ResponseEntity.ok(
                convertirEnDto(repository.save(existant))
        );
    }

    // =====================================================
    // SUPPRIMER UN CRITERE
    // =====================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @Transactional
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {

        AppelOffreCritere existant = repository.findById(id)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Critère associé introuvable."
                ));

        verifierPublie(existant.getAppelOffre());

        CritereEvaluation critere = existant.getCritere();

        repository.delete(existant);
        repository.flush();

        // Supprimer le critère uniquement s'il n'est plus utilisé
        if (critere != null) {

            boolean encoreUtilise = repository.findAll()
                    .stream()
                    .anyMatch(a ->
                            a.getCritere() != null
                                    && critere.getIdCritere().equals(
                                    a.getCritere().getIdCritere()
                            )
                    );

            if (!encoreUtilise) {
                critereRepository.deleteById(
                        critere.getIdCritere()
                );
            }
        }

        return ResponseEntity.noContent().build();
    }

    // =====================================================
    // VISIBILITE DES CRITERES
    // =====================================================

    private boolean visible(
            AppelOffreCritere association,
            Authentication auth
    ) {

        boolean evaluateur = auth != null
                && auth.getAuthorities()
                .stream()
                .anyMatch(r ->
                        "ROLE_EVALUATEUR".equals(r.getAuthority())
                );

        if (!evaluateur) {
            return true;
        }

        return association.getAppelOffre() != null
                && association.getAppelOffre().getStatut() != null
                && STATUTS_EVALUATEUR.contains(
                association.getAppelOffre()
                        .getStatut()
                        .toUpperCase()
        );
    }

    // =====================================================
    // REGLE PRINCIPALE :
    // CREATION / MODIFICATION / SUPPRESSION UNIQUEMENT PUBLIE
    // =====================================================

    private void verifierPublie(AppelOffre appelOffre) {

        if (appelOffre == null
                || appelOffre.getStatut() == null
                || !"PUBLIE".equalsIgnoreCase(
                appelOffre.getStatut()
        )) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "Les critères peuvent être créés ou modifiés uniquement pour un appel d'offres publié."
            );
        }
    }

    // =====================================================
    // VALIDATION DE LA PONDERATION
    // =====================================================

    private void validerPonderation(BigDecimal ponderation) {

        if (ponderation == null
                || ponderation.compareTo(BigDecimal.ZERO) <= 0
                || ponderation.compareTo(TOTAL) > 0) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La pondération doit être supérieure à 0 et inférieure ou égale à 20."
            );
        }
    }

    // =====================================================
    // VERIFICATION DU TOTAL : MAXIMUM 20 POINTS
    // =====================================================

    private void verifierTotal(
            Long idAppel,
            Long idAssociationIgnoree,
            BigDecimal nouvellePonderation
    ) {

        BigDecimal autres =
                repository.findByAppelOffre_IdAppelOffre(idAppel)
                        .stream()
                        .filter(a ->
                                idAssociationIgnoree == null
                                        || !idAssociationIgnoree.equals(
                                        a.getIdAppelOffreCritere()
                                )
                        )
                        .map(AppelOffreCritere::getPonderation)
                        .filter(p -> p != null)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal total = autres.add(nouvellePonderation);

        if (total.compareTo(TOTAL) > 0) {

            BigDecimal reste = TOTAL.subtract(autres);

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La somme des pondérations ne doit pas dépasser 20. "
                            + "Il reste "
                            + reste.stripTrailingZeros().toPlainString()
                            + " point(s) disponible(s)."
            );
        }
    }

    // =====================================================
    // RECHERCHER UN APPEL D'OFFRES
    // =====================================================

    private AppelOffre trouverAppel(Long id) {

        return appelOffreRepository.findById(id)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Appel d'offres introuvable."
                ));
    }

    // =====================================================
    // PREPARER UNE ASSOCIATION
    // =====================================================

    private AppelOffreCritere preparer(
            AppelOffreCritereRequest request,
            Long idAssociationIgnoree
    ) {

        if (request.getIdAppelOffre() == null
                || request.getIdCritere() == null
                || request.getPonderation() == null) {

            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "L'appel d'offres, le critère et la pondération sont obligatoires."
            );
        }

        validerPonderation(request.getPonderation());

        AppelOffre appelOffre =
                trouverAppel(request.getIdAppelOffre());

        verifierPublie(appelOffre);

        CritereEvaluation critere = critereRepository
                .findById(request.getIdCritere())
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Critère d'évaluation introuvable."
                ));

        verifierTotal(
                appelOffre.getIdAppelOffre(),
                idAssociationIgnoree,
                request.getPonderation()
        );

        AppelOffreCritere association = new AppelOffreCritere();

        association.setAppelOffre(appelOffre);
        association.setCritere(critere);
        association.setPonderation(request.getPonderation());

        return association;
    }

    // =====================================================
    // CONVERSION DTO
    // =====================================================

    private AppelOffreCritereDto convertirEnDto(
            AppelOffreCritere association
    ) {

        AppelOffreCritereDto dto = new AppelOffreCritereDto();

        dto.setIdAppelOffreCritere(
                association.getIdAppelOffreCritere()
        );

        dto.setPonderation(association.getPonderation());

        dto.setIdAppelOffre(
                association.getAppelOffre().getIdAppelOffre()
        );

        dto.setReferenceAppelOffre(
                association.getAppelOffre().getReference()
        );

        dto.setObjetAppelOffre(
                association.getAppelOffre().getObjet()
        );

        dto.setStatutAppelOffre(
                association.getAppelOffre().getStatut()
        );

        dto.setIdCritere(
                association.getCritere().getIdCritere()
        );

        dto.setNomCritere(
                association.getCritere().getNomCritere()
        );

        dto.setDescriptionCritere(
                association.getCritere().getDescription()
        );

        return dto;
    }

    // =====================================================
    // GESTION DES ERREURS
    // =====================================================

    private ResponseStatusException erreur(
            HttpStatus statut,
            String message
    ) {
        return new ResponseStatusException(statut, message);
    }

    // =====================================================
    // CLASSE REQUEST : CREATION
    // =====================================================

    public static class CritereAppelRequest {

        private Long idAppelOffre;
        private String nomCritere;
        private String description;
        private BigDecimal ponderation;

        public Long getIdAppelOffre() {
            return idAppelOffre;
        }

        public void setIdAppelOffre(Long v) {
            this.idAppelOffre = v;
        }

        public String getNomCritere() {
            return nomCritere;
        }

        public void setNomCritere(String v) {
            this.nomCritere = v;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String v) {
            this.description = v;
        }

        public BigDecimal getPonderation() {
            return ponderation;
        }

        public void setPonderation(BigDecimal v) {
            this.ponderation = v;
        }
    }

    // =====================================================
    // CLASSE REQUEST : ASSOCIATION / MODIFICATION
    // =====================================================

    public static class AppelOffreCritereRequest {

        private Long idAppelOffre;
        private Long idCritere;
        private BigDecimal ponderation;
        private String nomCritere;
        private String description;

        public Long getIdAppelOffre() {
            return idAppelOffre;
        }

        public void setIdAppelOffre(Long v) {
            this.idAppelOffre = v;
        }

        public Long getIdCritere() {
            return idCritere;
        }

        public void setIdCritere(Long v) {
            this.idCritere = v;
        }

        public BigDecimal getPonderation() {
            return ponderation;
        }

        public void setPonderation(BigDecimal v) {
            this.ponderation = v;
        }

        public String getNomCritere() {
            return nomCritere;
        }

        public void setNomCritere(String v) {
            this.nomCritere = v;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String v) {
            this.description = v;
        }
    }

    // =====================================================
    // CLASSE DTO : REPONSE
    // =====================================================

    public static class AppelOffreCritereDto {

        private Long idAppelOffreCritere;
        private BigDecimal ponderation;
        private Long idAppelOffre;
        private String referenceAppelOffre;
        private String objetAppelOffre;
        private String statutAppelOffre;
        private Long idCritere;
        private String nomCritere;
        private String descriptionCritere;

        public Long getIdAppelOffreCritere() {
            return idAppelOffreCritere;
        }

        public void setIdAppelOffreCritere(Long v) {
            this.idAppelOffreCritere = v;
        }

        public BigDecimal getPonderation() {
            return ponderation;
        }

        public void setPonderation(BigDecimal v) {
            this.ponderation = v;
        }

        public Long getIdAppelOffre() {
            return idAppelOffre;
        }

        public void setIdAppelOffre(Long v) {
            this.idAppelOffre = v;
        }

        public String getReferenceAppelOffre() {
            return referenceAppelOffre;
        }

        public void setReferenceAppelOffre(String v) {
            this.referenceAppelOffre = v;
        }

        public String getObjetAppelOffre() {
            return objetAppelOffre;
        }

        public void setObjetAppelOffre(String v) {
            this.objetAppelOffre = v;
        }

        public String getStatutAppelOffre() {
            return statutAppelOffre;
        }

        public void setStatutAppelOffre(String v) {
            this.statutAppelOffre = v;
        }

        public Long getIdCritere() {
            return idCritere;
        }

        public void setIdCritere(Long v) {
            this.idCritere = v;
        }

        public String getNomCritere() {
            return nomCritere;
        }

        public void setNomCritere(String v) {
            this.nomCritere = v;
        }

        public String getDescriptionCritere() {
            return descriptionCritere;
        }

        public void setDescriptionCritere(String v) {
            this.descriptionCritere = v;
        }
    }
}
