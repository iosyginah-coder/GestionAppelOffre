
package com.example.backend.controller;

import com.example.backend.entity.PieceRequise;
import com.example.backend.service.PieceRequiseService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pieces-requises")
@CrossOrigin(
        origins = {"http://localhost:3000", "http://localhost:5173"},
        allowCredentials = "true"
)
public class PieceRequiseController {

    private final PieceRequiseService service;

    public PieceRequiseController(PieceRequiseService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<PieceRequise>> obtenirToutes() {
        return ResponseEntity.ok(service.obtenirToutes());
    }

    @GetMapping("/appel-offre/{idAppelOffre}")
    public ResponseEntity<List<PieceRequise>> obtenirParAppelOffre(
            @PathVariable Long idAppelOffre) {

        return ResponseEntity.ok(
                service.obtenirParAppelOffre(idAppelOffre)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<PieceRequise> obtenirParId(
            @PathVariable Long id) {

        return ResponseEntity.ok(service.obtenirParId(id));
    }

    @PostMapping("/appel-offre/{idAppelOffre}")
    public ResponseEntity<PieceRequise> ajouter(
            @PathVariable Long idAppelOffre,
            @RequestBody PieceRequise piece) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.ajouter(idAppelOffre, piece));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PieceRequise> modifier(
            @PathVariable Long id,
            @RequestBody PieceRequise piece) {

        return ResponseEntity.ok(service.modifier(id, piece));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long id) {

        service.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}
