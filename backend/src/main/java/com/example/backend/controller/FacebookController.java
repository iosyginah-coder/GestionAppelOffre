package com.example.backend.controller;

import com.example.backend.entity.AppelOffre;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.service.FacebookService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/social/facebook")
public class FacebookController {

    private final FacebookService facebookService;
    private final AppelOffreRepository appelOffreRepository;

    public FacebookController(
            FacebookService facebookService,
            AppelOffreRepository appelOffreRepository) {

        this.facebookService = facebookService;
        this.appelOffreRepository = appelOffreRepository;
    }

    /** Re-publier (ou réessayer) un appel d'offres déjà PUBLIE sur la page Facebook. */
    @PostMapping("/publish")
    @PreAuthorize("hasAnyRole('RESPONSABLE_MARCHES', 'ADMINISTRATEUR')")
    public ResponseEntity<Map<String, Object>> publierSurFacebook(
            @RequestBody FacebookPublicationRequest request) {

        if (request == null || request.idAppelOffre() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "L'identifiant de l'appel d'offres est obligatoire."));
        }

        AppelOffre appel = appelOffreRepository
                .findById(request.idAppelOffre()).orElse(null);

        if (appel == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Appel d'offres introuvable."));
        }

        FacebookService.Resultat r = facebookService.publierAppelOffre(appel);

        if (r.succes()) {
            return ResponseEntity.ok(Map.of("success", true, "message", r.message()));
        }

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "success", false,
                "message", "Publication Facebook échouée : " + r.message()));
    }

    public record FacebookPublicationRequest(Long idAppelOffre) {
    }
}
