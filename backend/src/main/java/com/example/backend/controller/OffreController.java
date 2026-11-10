
package com.example.backend.controller;

import com.example.backend.entity.Offre;
import com.example.backend.service.EvaluationService;
import com.example.backend.service.OffreService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/offres")
public class OffreController {

    private final OffreService service;
    private final EvaluationService evaluationService;

    public OffreController(
            OffreService service,
            EvaluationService evaluationService
    ) {
        this.service = service;
        this.evaluationService = evaluationService;
    }

    // Afficher les offres du soumissionnaire connecté
    @GetMapping("/mes-offres")
    @PreAuthorize("hasRole('SOUMISSIONNAIRE')")
    public ResponseEntity<List<Offre>> mesOffres() {
        return ResponseEntity.ok(service.mesOffres());
    }

    // Déposer une offre avec ses pièces jointes
    @PostMapping(
            value = "/deposer",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('SOUMISSIONNAIRE')")
    public ResponseEntity<Offre> deposer(
            @RequestParam("idAppelOffre") Long idAppelOffre,
            @RequestParam("montant") BigDecimal montant,
            @RequestParam(value = "idsPieces", required = false)
            List<Long> idsPieces,
            @RequestParam(value = "fichiers", required = false)
            List<MultipartFile> fichiers
    ) {
        Offre resultat = service.deposer(
                idAppelOffre,
                montant,
                idsPieces,
                fichiers
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resultat);
    }

    // Afficher les offres déposées pour les évaluateurs
    @GetMapping("/evaluateur")
    @PreAuthorize("hasRole('EVALUATEUR')")
    public ResponseEntity<List<EvaluationService.OffreEvaluationDto>>
    offresPourEvaluation() {

        return ResponseEntity.ok(
                evaluationService.listerOffresPourEvaluation()
        );
    }
}
