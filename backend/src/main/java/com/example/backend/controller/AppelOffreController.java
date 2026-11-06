
package com.example.backend.controller;

import com.example.backend.entity.AppelOffre;
import com.example.backend.service.AppelOffreService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
@PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
public class AppelOffreController {

    private final AppelOffreService service;

    public AppelOffreController(AppelOffreService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<AppelOffre>> obtenirTous() {
        return ResponseEntity.ok(service.obtenirTous());
    }

    @GetMapping("/recherche")
    public ResponseEntity<List<AppelOffre>> rechercher(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String typeMarche,
            @RequestParam(required = false) String objet) {

        return ResponseEntity.ok(
                service.rechercher(statut, typeMarche, objet)
        );
    }

    @GetMapping("/statistiques")
    public ResponseEntity<Map<String, Object>> statistiques() {
        return ResponseEntity.ok(service.obtenirStatistiques());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppelOffre> obtenirParId(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.obtenirParId(id));
    }

    @PostMapping
    public ResponseEntity<AppelOffre> creer(
            @RequestBody AppelOffre appel) {

        AppelOffre resultat = service.creer(appel);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resultat);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppelOffre> modifier(
            @PathVariable Long id,
            @RequestBody AppelOffre appel) {

        return ResponseEntity.ok(
                service.modifier(id, appel)
        );
    }

    @PatchMapping("/{id}/publier")
    public ResponseEntity<AppelOffre> publier(
            @PathVariable Long id) {

        AppelOffre resultat = service.publier(id);

        return ResponseEntity.ok(resultat);
    }

    @PatchMapping("/{id}/cloturer")
    public ResponseEntity<AppelOffre> cloturer(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                service.cloturer(id)
        );
    }

    @PatchMapping("/{id}/annuler")
    public ResponseEntity<AppelOffre> annuler(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                service.annuler(id)
        );
    }

    @PatchMapping("/{id}/attribuer")
    public ResponseEntity<AppelOffre> attribuer(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                service.attribuer(id)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long id) {

        service.supprimer(id);

        return ResponseEntity.noContent().build();
    }
}
