
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
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/appel-offre-criteres")
public class AppelOffreCritereController {

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

    // Consulter les critères associés aux appels d'offres
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRATEUR','RESPONSABLE_MARCHES','EVALUATEUR','SOUMISSIONNAIRE')")
    public ResponseEntity<List<AppelOffreCritereDto>> lister() {

        List<AppelOffreCritereDto> resultat =
                repository.findAll()
                        .stream()
                        .map(this::convertirEnDto)
                        .toList();

        return ResponseEntity.ok(resultat);
    }

    // Ajouter un critère à un appel d'offres
    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<AppelOffreCritereDto> ajouter(
            @RequestBody AppelOffreCritereRequest request
    ) {

        AppelOffreCritere entity = preparer(request);

        AppelOffreCritere sauvegarde =
                repository.save(entity);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(convertirEnDto(sauvegarde));
    }

    // Modifier la pondération d'un critère
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<AppelOffreCritereDto> modifier(
            @PathVariable Long id,
            @RequestBody AppelOffreCritereRequest request
    ) {

        AppelOffreCritere existant =
                repository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Association appel d'offre / critère introuvable."
                                )
                        );

        AppelOffreCritere donnees = preparer(request);

        existant.setAppelOffre(donnees.getAppelOffre());
        existant.setCritere(donnees.getCritere());
        existant.setPonderation(donnees.getPonderation());

        AppelOffreCritere sauvegarde =
                repository.save(existant);

        return ResponseEntity.ok(convertirEnDto(sauvegarde));
    }

    // Supprimer une association
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long id
    ) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);

        return ResponseEntity.noContent().build();
    }

    private AppelOffreCritere preparer(
            AppelOffreCritereRequest request
    ) {

        if (request.getIdAppelOffre() == null
                || request.getIdCritere() == null
                || request.getPonderation() == null) {
            throw new IllegalArgumentException(
                    "L'appel d'offres, le critère et la pondération sont obligatoires."
            );
        }

        if (request.getPonderation().compareTo(BigDecimal.ZERO) <= 0
                || request.getPonderation().compareTo(
                new BigDecimal("100")
        ) > 0) {
            throw new IllegalArgumentException(
                    "La pondération doit être comprise entre 0 et 100."
            );
        }

        AppelOffre appelOffre =
                appelOffreRepository.findById(
                        request.getIdAppelOffre()
                ).orElseThrow(() ->
                        new IllegalArgumentException(
                                "Appel d'offres introuvable."
                        )
                );

        CritereEvaluation critere =
                critereRepository.findById(
                        request.getIdCritere()
                ).orElseThrow(() ->
                        new IllegalArgumentException(
                                "Critère d'évaluation introuvable."
                        )
                );

        AppelOffreCritere association =
                new AppelOffreCritere();

        association.setAppelOffre(appelOffre);
        association.setCritere(critere);
        association.setPonderation(request.getPonderation());

        return association;
    }

    private AppelOffreCritereDto convertirEnDto(
            AppelOffreCritere association
    ) {

        AppelOffreCritereDto dto =
                new AppelOffreCritereDto();

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

    public static class AppelOffreCritereRequest {

        private Long idAppelOffre;
        private Long idCritere;
        private BigDecimal ponderation;

        public Long getIdAppelOffre() {
            return idAppelOffre;
        }

        public void setIdAppelOffre(Long idAppelOffre) {
            this.idAppelOffre = idAppelOffre;
        }

        public Long getIdCritere() {
            return idCritere;
        }

        public void setIdCritere(Long idCritere) {
            this.idCritere = idCritere;
        }

        public BigDecimal getPonderation() {
            return ponderation;
        }

        public void setPonderation(BigDecimal ponderation) {
            this.ponderation = ponderation;
        }
    }

    public static class AppelOffreCritereDto {

        private Long idAppelOffreCritere;
        private BigDecimal ponderation;
        private Long idAppelOffre;
        private String referenceAppelOffre;
        private String objetAppelOffre;
        private Long idCritere;
        private String nomCritere;
        private String descriptionCritere;

        public Long getIdAppelOffreCritere() {
            return idAppelOffreCritere;
        }

        public void setIdAppelOffreCritere(Long id) {
            this.idAppelOffreCritere = id;
        }

        public BigDecimal getPonderation() {
            return ponderation;
        }

        public void setPonderation(BigDecimal ponderation) {
            this.ponderation = ponderation;
        }

        public Long getIdAppelOffre() {
            return idAppelOffre;
        }

        public void setIdAppelOffre(Long idAppelOffre) {
            this.idAppelOffre = idAppelOffre;
        }

        public String getReferenceAppelOffre() {
            return referenceAppelOffre;
        }

        public void setReferenceAppelOffre(String reference) {
            this.referenceAppelOffre = reference;
        }

        public String getObjetAppelOffre() {
            return objetAppelOffre;
        }

        public void setObjetAppelOffre(String objet) {
            this.objetAppelOffre = objet;
        }

        public Long getIdCritere() {
            return idCritere;
        }

        public void setIdCritere(Long idCritere) {
            this.idCritere = idCritere;
        }

        public String getNomCritere() {
            return nomCritere;
        }

        public void setNomCritere(String nomCritere) {
            this.nomCritere = nomCritere;
        }

        public String getDescriptionCritere() {
            return descriptionCritere;
        }

        public void setDescriptionCritere(String description) {
            this.descriptionCritere = description;
        }
    }
}
