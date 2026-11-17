
package com.example.backend.controller;

import com.example.backend.entity.PieceRequise;
import com.example.backend.service.PieceRequiseService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pieces-requises")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://localhost:5173"
        },
        allowCredentials = "true"
)
public class PieceRequiseController {

    private final PieceRequiseService service;

    public PieceRequiseController(PieceRequiseService service) {
        this.service = service;
    }

    // =========================================
    // ROUTES PUBLIQUES
    // =========================================

    // Consulter les pièces d'un appel d'offres publié
    @GetMapping("/public/appel-offre/{idAppelOffre}")
    public ResponseEntity<List<PieceRequise>> obtenirPiecesPubliques(
            @PathVariable Long idAppelOffre
    ) {

        return ResponseEntity.ok(
                service.obtenirPiecesPubliques(idAppelOffre)
        );
    }

    // =========================================
    // ROUTES RESERVEES AU RESPONSABLE
    // =========================================

    // Afficher toutes les pièces
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @GetMapping
    public ResponseEntity<List<PieceRequise>> obtenirToutes() {

        return ResponseEntity.ok(
                service.obtenirToutes()
        );
    }

    // Afficher les pièces d'un appel d'offres
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @GetMapping("/appel-offre/{idAppelOffre}")
    public ResponseEntity<List<PieceRequise>> obtenirParAppelOffre(
            @PathVariable Long idAppelOffre
    ) {

        return ResponseEntity.ok(
                service.obtenirParAppelOffre(idAppelOffre)
        );
    }

    // Afficher une pièce par son identifiant
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @GetMapping("/{id}")
    public ResponseEntity<PieceRequise> obtenirParId(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                service.obtenirParId(id)
        );
    }

    // Ajouter une pièce requise
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @PostMapping("/appel-offre/{idAppelOffre}")
    public ResponseEntity<PieceRequise> ajouter(
            @PathVariable Long idAppelOffre,
            @RequestBody PieceRequise piece
    ) {

        PieceRequise nouvellePiece =
                service.ajouter(idAppelOffre, piece);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(nouvellePiece);
    }

    // Modifier une pièce requise
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @PutMapping("/{id}")
    public ResponseEntity<PieceRequise> modifier(
            @PathVariable Long id,
            @RequestBody PieceRequise piece
    ) {

        return ResponseEntity.ok(
                service.modifier(id, piece)
        );
    }

    // Supprimer une pièce requise
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long id
    ) {

        service.supprimer(id);

        return ResponseEntity.noContent().build();
    }
}
