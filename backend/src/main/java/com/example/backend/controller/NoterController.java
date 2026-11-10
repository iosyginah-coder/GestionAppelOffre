
package com.example.backend.controller;

import com.example.backend.service.EvaluationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notes")
@PreAuthorize("hasRole('EVALUATEUR')")
public class NoterController {

    private final EvaluationService evaluationService;

    public NoterController(
            EvaluationService evaluationService
    ) {
        this.evaluationService = evaluationService;
    }

    // Consulter les notes déjà enregistrées pour une offre
    @GetMapping("/offre/{offreId}")
    public ResponseEntity<?> notesParOffre(
            @PathVariable Long offreId
    ) {
        return ResponseEntity.ok(
                evaluationService.listerNotes(offreId)
        );
    }

    // Enregistrer ou modifier les notes d'évaluation
    @PostMapping("/evaluer")
    public ResponseEntity<?> evaluer(
            @RequestBody EvaluationService.EvaluationRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(evaluationService.enregistrerEvaluation(request));
    }
}
