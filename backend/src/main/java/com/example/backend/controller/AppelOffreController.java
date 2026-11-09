
package com.example.backend.controller;

import com.example.backend.entity.AppelOffre;
import com.example.backend.service.AppelOffreService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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

    public AppelOffreController(AppelOffreService service) {
        this.service = service;
    }

    // ==========================================
    // RESPONSABLE MARCHES : GESTION DES OFFRES
    // ==========================================

    // Liste complète des appels d'offres
    @GetMapping
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<List<AppelOffre>> obtenirTous() {

        return ResponseEntity.ok(service.obtenirTous());
    }

    // Recherche et filtrage
    @GetMapping("/recherche")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<List<AppelOffre>> rechercher(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String typeMarche,
            @RequestParam(required = false) String objet) {

        return ResponseEntity.ok(
                service.rechercher(statut, typeMarche, objet)
        );
    }

    // Statistiques
    @GetMapping("/statistiques")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<Map<String, Object>> statistiques() {

        return ResponseEntity.ok(service.obtenirStatistiques());
    }

    // Détail d'un appel d'offres pour le responsable
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

        AppelOffre resultat = service.creer(appel);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resultat);
    }

    // Modification
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> modifier(
            @PathVariable Long id,
            @RequestBody AppelOffre appel) {

        return ResponseEntity.ok(
                service.modifier(id, appel)
        );
    }

    // Publication
    @PatchMapping("/{id}/publier")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<AppelOffre> publier(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.publier(id));
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
    // SOUMISSIONNAIRE : CONSULTATION DES OFFRES
    // ==========================================

    // Afficher uniquement les appels d'offres publiés
    @GetMapping("/soumissionnaire/publications")
    @PreAuthorize("hasRole('SOUMISSIONNAIRE')")
    public ResponseEntity<List<AppelOffre>> obtenirOffresPubliees() {

        List<AppelOffre> offresPubliees = service.obtenirTous()
                .stream()
                .filter(appel ->
                        "PUBLIE".equalsIgnoreCase(appel.getStatut())
                )
                .toList();

        return ResponseEntity.ok(offresPubliees);
    }

    // Consulter le détail d'une offre publiée
    @GetMapping("/soumissionnaire/publications/{id}")
    @PreAuthorize("hasRole('SOUMISSIONNAIRE')")
    public ResponseEntity<AppelOffre> obtenirDetailOffrePubliee(
            @PathVariable Long id) {

        AppelOffre appel = service.obtenirParId(id);

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Cette offre n'est pas disponible."
            );
        }

        return ResponseEntity.ok(appel);
    }
}
