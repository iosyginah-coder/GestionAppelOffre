
package com.example.backend.controller;

import com.example.backend.entity.AppelOffre;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.service.FacebookService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/social/facebook")
public class FacebookController {

    private static final Logger logger =
            LoggerFactory.getLogger(FacebookController.class);

    private final FacebookService facebookService;
    private final AppelOffreRepository appelOffreRepository;

    public FacebookController(
            FacebookService facebookService,
            AppelOffreRepository appelOffreRepository) {

        this.facebookService = facebookService;
        this.appelOffreRepository = appelOffreRepository;
    }

    // =====================================================
    // REPUBLIER UN APPEL D'OFFRES SUR FACEBOOK
    // =====================================================

    @PostMapping("/publish")
    @PreAuthorize("hasAnyRole('RESPONSABLE_MARCHES', 'ADMINISTRATEUR')")
    public ResponseEntity<Map<String, Object>> publierSurFacebook(
            @RequestBody FacebookPublicationRequest request) {

        // 1. Vérifier la requête

        if (request == null || request.idAppelOffre() == null) {

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "L'identifiant de l'appel d'offres est obligatoire."
            ));
        }

        // 2. Récupérer l'appel d'offres

        AppelOffre appel = appelOffreRepository
                .findById(request.idAppelOffre())
                .orElse(null);

        if (appel == null) {

            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Appel d'offres introuvable."
            ));
        }

        // 3. Vérifier son statut

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Cet appel d'offres doit être publié dans SPAT avant sa publication Facebook."
            ));
        }

        // 4. Publier sur Facebook

        FacebookService.Resultat resultat =
                facebookService.publierAppelOffre(appel);

        // 5. Publication réussie

        if (resultat.succes()) {

            logger.info(
                    "Publication Facebook réussie pour l'appel {}",
                    appel.getReference()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", resultat.message(),
                    "idPost", resultat.idPost(),
                    "lienDepot", resultat.lienDepot()
            ));
        }

        // 6. Publication échouée

        logger.error(
                "Publication Facebook échouée pour {} : {}",
                appel.getReference(),
                resultat.message()
        );

        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "success", false,
                "message", "Publication Facebook échouée : " + resultat.message()
        ));
    }

    // =====================================================
    // REQUÊTE
    // =====================================================

    public record FacebookPublicationRequest(
            Long idAppelOffre
    ) {
    }
}
