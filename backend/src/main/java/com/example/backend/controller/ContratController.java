package com.example.backend.controller;

import com.example.backend.service.ContratService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contrats")
@PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
public class ContratController {

    private final ContratService contratService;

    public ContratController(ContratService contratService) {
        this.contratService = contratService;
    }

    // Soumissionnaires publiés, groupés par appel d'offres puis séparés
    // en deux colonnes : fournisseurs (gauche) et prestataires (droite)
    @GetMapping("/responsable")
    public List<Map<String, Object>> liste() {
        return contratService.liste();
    }

    // Établir le contrat d'un soumissionnaire publié
    @PostMapping("/offre/{idOffre}")
    public ResponseEntity<Map<String, Object>> creer(
            @PathVariable Long idOffre,
            @RequestBody ContratService.ContratRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contratService.creer(idOffre, request));
    }

    // Modifier un contrat tant qu'il est en brouillon
    @PutMapping("/{idContrat}")
    public Map<String, Object> modifier(
            @PathVariable Long idContrat,
            @RequestBody ContratService.ContratRequest request) {
        return contratService.modifier(idContrat, request);
    }

    @PostMapping("/{idContrat}/signer")
    public Map<String, Object> signer(@PathVariable Long idContrat) {
        return contratService.signer(idContrat);
    }

    @DeleteMapping("/{idContrat}")
    public ResponseEntity<Map<String, String>> supprimer(@PathVariable Long idContrat) {
        contratService.supprimer(idContrat);
        return ResponseEntity.ok(Map.of("message", "Contrat supprimé."));
    }
}
