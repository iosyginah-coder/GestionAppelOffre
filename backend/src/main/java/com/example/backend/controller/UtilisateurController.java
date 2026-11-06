package com.example.backend.controller;

import com.example.backend.dto.UtilisateurDTO;
import com.example.backend.entity.Utilisateur;
import com.example.backend.service.UtilisateurService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/utilisateurs")
@PreAuthorize("hasRole('ADMINISTRATEUR')")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    public UtilisateurController(
            UtilisateurService utilisateurService) {

        this.utilisateurService = utilisateurService;
    }

    @GetMapping
    public ResponseEntity<List<UtilisateurDTO.Reponse>> list() {

        List<UtilisateurDTO.Reponse> utilisateurs =
                utilisateurService.obtenirTous()
                        .stream()
                        .map(UtilisateurDTO.Reponse::depuis)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(utilisateurs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurDTO.Reponse> get(
            @PathVariable Long id) {

        Utilisateur utilisateur =
                utilisateurService.obtenirParId(id);

        return ResponseEntity.ok(
                UtilisateurDTO.Reponse.depuis(utilisateur)
        );
    }

    @PostMapping
    public ResponseEntity<UtilisateurDTO.Reponse> create(
            @RequestBody UtilisateurDTO.CreationRequest request) {

        Utilisateur utilisateur =
                utilisateurService.creer(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                UtilisateurDTO.Reponse.depuis(utilisateur)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurDTO.Reponse> update(
            @PathVariable Long id,
            @RequestBody UtilisateurDTO.ModificationRequest request) {

        Utilisateur utilisateur =
                utilisateurService.modifier(id, request);

        return ResponseEntity.ok(
                UtilisateurDTO.Reponse.depuis(utilisateur)
        );
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<UtilisateurDTO.Reponse> changeStatus(
            @PathVariable Long id,
            @RequestBody UtilisateurDTO.StatutRequest request) {

        if (request == null || request.statut() == null) {
            return ResponseEntity.badRequest().build();
        }

        Utilisateur utilisateur =
                utilisateurService.changerStatut(
                        id,
                        request.statut()
                );

        return ResponseEntity.ok(
                UtilisateurDTO.Reponse.depuis(utilisateur)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        utilisateurService.supprimer(id);

        return ResponseEntity.noContent().build();
    }
}
