
package com.example.backend.controller;

import com.example.backend.entity.AppelOffre;
import com.example.backend.service.AppelOffreService;
import com.example.backend.service.FacebookService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appel-offres")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://localhost:5173"
        },
        allowCredentials = "true"
)
public class AppelOffreController {

    private final AppelOffreService service;
    private final FacebookService facebookService;

    public AppelOffreController(
            AppelOffreService service,
            FacebookService facebookService) {

        this.service = service;
        this.facebookService = facebookService;
    }

    // ==========================================
    // RESPONSABLE MARCHES
    // ==========================================

    // Liste complète
    @GetMapping
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<List<AppelOffre>> obtenirTous() {
        return ResponseEntity.ok(service.obtenirTous());
    }

    // Recherche
    @GetMapping("/recherche")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<List<AppelOffre>> rechercher(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String objet) {

        return ResponseEntity.ok(
                service.rechercher(statut, objet)
        );
    }

    // Statistiques
    @GetMapping("/statistiques")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<Map<String, Object>> statistiques() {
        return ResponseEntity.ok(service.obtenirStatistiques());
    }

    // Détail
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> obtenirParId(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.obtenirParId(id));
    }

    // Création
    @PostMapping
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> creer(
            @RequestBody AppelOffre appel) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.creer(appel));
    }

    // Modification
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> modifier(
            @PathVariable Long id,
            @RequestBody AppelOffre appel) {

        return ResponseEntity.ok(service.modifier(id, appel));
    }

    // Publication SPAT + publication automatique sur Facebook.
    // La publication SPAT est déjà validée (transaction terminée) avant l'appel
    // à Facebook : un échec Facebook n'annule donc jamais la publication.
    @PatchMapping("/{id}/publier")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<Map<String, Object>> publier(
            @PathVariable Long id) {

        AppelOffre appel = service.publier(id);

        FacebookService.Resultat fb = facebookService.publierAppelOffre(appel);

        Map<String, Object> facebook = new LinkedHashMap<>();
        facebook.put("success", fb.succes());
        facebook.put("message", fb.message());

        Map<String, Object> reponse = new LinkedHashMap<>();
        reponse.put("appelOffre", appel);
        reponse.put("facebook", facebook);

        return ResponseEntity.ok(reponse);
    }

    // Clôture
    @PatchMapping("/{id}/cloturer")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> cloturer(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.cloturer(id));
    }

    // Annulation
    @PatchMapping("/{id}/annuler")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> annuler(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.annuler(id));
    }

    // Attribution
    @PatchMapping("/{id}/attribuer")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> attribuer(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.attribuer(id));
    }

    // Suppression
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long id) {

        service.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // CONSULTATION PUBLIQUE
    // AUCUNE AUTHENTIFICATION
    // ==========================================

    // Liste des appels publiés
    @GetMapping("/publications")
    public ResponseEntity<List<AppelOffre>> obtenirOffresPubliees() {

        return ResponseEntity.ok(
                service.obtenirOffresPubliees()
        );
    }

    // Détail d'un appel publié
    @GetMapping("/publications/{id}")
    public ResponseEntity<AppelOffre> obtenirDetailOffrePubliee(
            @PathVariable Long id) {

        AppelOffre appel = service.obtenirParId(id);

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Cet appel d'offres n'est pas disponible."
            );
        }

        return ResponseEntity.ok(appel);
    }

}
