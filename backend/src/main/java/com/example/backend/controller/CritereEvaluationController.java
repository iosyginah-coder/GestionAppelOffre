package com.example.backend.controller;

import com.example.backend.entity.CritereEvaluation;
import com.example.backend.repository.AppelOffreCritereRepository;
import com.example.backend.repository.CritereEvaluationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/criteres-evaluation")
@PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
public class CritereEvaluationController {

    private static final BigDecimal TOTAL = new BigDecimal("20");

    private final CritereEvaluationRepository repo;
    private final AppelOffreCritereRepository associationRepo;

    public CritereEvaluationController(
            CritereEvaluationRepository repo,
            AppelOffreCritereRepository associationRepo
    ) {
        this.repo = repo;
        this.associationRepo = associationRepo;
    }

    @GetMapping
    public List<CritereEvaluation> lister() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CritereEvaluation> obtenir(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<CritereEvaluation> creer(
            @RequestBody CritereEvaluation body
    ) {
        valider(body);
        body.setIdCritere(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CritereEvaluation> modifier(
            @PathVariable Long id,
            @RequestBody CritereEvaluation body
    ) {
        CritereEvaluation existant = repo.findById(id).orElse(null);

        if (existant == null) {
            return ResponseEntity.notFound().build();
        }

        valider(body);

        existant.setNomCritere(body.getNomCritere().trim());
        existant.setDescription(body.getDescription());
        existant.setPonderation(body.getPonderation());

        return ResponseEntity.ok(repo.save(existant));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {

        if (!repo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        boolean utilise = associationRepo.findAll().stream()
                .anyMatch(a -> a.getCritere() != null
                        && id.equals(a.getCritere().getIdCritere()));

        if (utilise) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ce critère est utilisé par un appel d'offres."
            );
        }

        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void valider(CritereEvaluation c) {

        if (c == null
                || c.getNomCritere() == null
                || c.getNomCritere().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom du critère est obligatoire."
            );
        }

        if (c.getPonderation() == null
                || c.getPonderation().compareTo(BigDecimal.ZERO) <= 0
                || c.getPonderation().compareTo(TOTAL) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La pondération doit être comprise entre 0 (exclu) et 20."
            );
        }
    }
}