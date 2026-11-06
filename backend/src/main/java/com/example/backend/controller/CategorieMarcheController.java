
package com.example.backend.controller;

import com.example.backend.entity.CategorieMarche;
import com.example.backend.repository.CategorieMarcheRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/categories-marches")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://localhost:5173"
})
public class CategorieMarcheController {

    private final CategorieMarcheRepository repository;

    public CategorieMarcheController(
            CategorieMarcheRepository repository
    ) {
        this.repository = repository;
    }

    // AFFICHER TOUTES LES CATEGORIES
    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(
                repository.findAllByOrderByNomCategorieAsc()
        );
    }

    // AFFICHER UNE CATEGORIE
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Optional<CategorieMarche> categorie =
                repository.findById(id);

        if (categorie.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Catégorie introuvable."));
        }

        return ResponseEntity.ok(categorie.get());
    }

    // AJOUTER UNE CATEGORIE
    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody CategorieMarche categorie
    ) {
        if (categorie.getNomCategorie() == null
                || categorie.getNomCategorie().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Le nom de la catégorie est obligatoire."));
        }

        String nom = categorie.getNomCategorie().trim();

        if (repository.existsByNomCategorieIgnoreCase(nom)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cette catégorie existe déjà."));
        }

        categorie.setIdCategorie(null);
        categorie.setNomCategorie(nom);

        if (categorie.getStatut() == null
                || categorie.getStatut().isBlank()) {
            categorie.setStatut("ACTIF");
        }

        if (!categorie.getStatut().equals("ACTIF")
                && !categorie.getStatut().equals("INACTIF")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Statut invalide."));
        }

        CategorieMarche saved = repository.save(categorie);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // MODIFIER UNE CATEGORIE
    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody CategorieMarche donnees
    ) {
        Optional<CategorieMarche> resultat =
                repository.findById(id);

        if (resultat.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Catégorie introuvable."));
        }

        if (donnees.getNomCategorie() == null
                || donnees.getNomCategorie().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Le nom est obligatoire."));
        }

        String nom = donnees.getNomCategorie().trim();

        if (repository.existsByNomCategorieIgnoreCaseAndIdCategorieNot(
                nom, id
        )) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cette catégorie existe déjà."));
        }

        CategorieMarche categorie = resultat.get();

        categorie.setNomCategorie(nom);
        categorie.setDescription(donnees.getDescription());

        if (donnees.getStatut() != null
                && !donnees.getStatut().isBlank()) {

            if (!donnees.getStatut().equals("ACTIF")
                    && !donnees.getStatut().equals("INACTIF")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Statut invalide."));
            }

            categorie.setStatut(donnees.getStatut());
        }

        return ResponseEntity.ok(repository.save(categorie));
    }

    // ACTIVER OU DESACTIVER
    @PatchMapping("/{id}/statut")
    public ResponseEntity<?> updateStatut(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        Optional<CategorieMarche> resultat =
                repository.findById(id);

        if (resultat.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Catégorie introuvable."));
        }

        String statut = body.get("statut");

        if (!"ACTIF".equals(statut) && !"INACTIF".equals(statut)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Statut invalide."));
        }

        CategorieMarche categorie = resultat.get();
        categorie.setStatut(statut);

        return ResponseEntity.ok(repository.save(categorie));
    }

    // SUPPRIMER
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Catégorie introuvable."));
        }

        repository.deleteById(id);

        return ResponseEntity.ok(
                Map.of("message", "Catégorie supprimée avec succès.")
        );
    }
}
