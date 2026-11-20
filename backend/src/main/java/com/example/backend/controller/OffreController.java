
package com.example.backend.controller;

import com.example.backend.entity.Offre;
import com.example.backend.entity.PieceDepot;
import com.example.backend.service.OffreService;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/offres")
public class OffreController {

    private final OffreService service;

    public OffreController(OffreService service) {
        this.service = service;
    }

    // DEPOT PUBLIC SANS CONNEXION

    @PostMapping(
            value = "/deposer",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Offre> deposer(

            @RequestParam("idAppelOffre") Long idAppelOffre,

            @RequestParam("typeSoumissionnaire")
            String typeSoumissionnaire,

            @RequestParam(value = "nomSoumissionnaire", required = false)
            String nomSoumissionnaire,

            @RequestParam(value = "entreprise", required = false)
            String entreprise,

            @RequestParam("emailSoumissionnaire")
            String email,

            @RequestParam(value = "telephoneSoumissionnaire", required = false)
            String telephone,

            @RequestParam(value = "adresse", required = false)
            String adresse,

            @RequestParam(value = "nif", required = false)
            String nif,

            @RequestParam(value = "stat", required = false)
            String stat,

            @RequestParam(value = "cinRecto", required = false)
            MultipartFile cinRecto,

            @RequestParam(value = "cinVerso", required = false)
            MultipartFile cinVerso,

            @RequestParam(value = "offreTechnique", required = false)
            MultipartFile offreTechnique,

            @RequestParam(value = "offreFinanciere", required = false)
            MultipartFile offreFinanciere,

            @RequestParam(value = "idsPieces", required = false)
            List<Long> idsPieces,

            @RequestParam(value = "fichiersPieces", required = false)
            List<MultipartFile> fichiersPieces
    ) {

        Offre resultat = service.deposer(
                idAppelOffre,
                typeSoumissionnaire,
                nomSoumissionnaire,
                entreprise,
                email,
                telephone,
                adresse,
                nif,
                stat,
                cinRecto,
                cinVerso,
                offreTechnique,
                offreFinanciere,
                idsPieces,
                fichiersPieces
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(resultat);
    }

    // CONSULTATION DES OFFRES PAR L'EVALUATEUR

    @GetMapping("/evaluateur")
    @PreAuthorize("hasRole('EVALUATEUR')")
    public ResponseEntity<List<Offre>> listerPourEvaluateur() {
        return ResponseEntity.ok(service.listerOffresPourEvaluation());
    }

    @GetMapping("/evaluateur/appel/{idAppelOffre}")
    @PreAuthorize("hasRole('EVALUATEUR')")
    public ResponseEntity<List<Offre>> listerParAppel(
            @PathVariable Long idAppelOffre) {

        return ResponseEntity.ok(
                service.listerParAppel(idAppelOffre));
    }

    @GetMapping("/{idOffre}/pieces")
    @PreAuthorize("hasRole('EVALUATEUR')")
    public ResponseEntity<List<PieceDepot>> listerPieces(
            @PathVariable Long idOffre) {

        return ResponseEntity.ok(
                service.listerPieces(idOffre));
    }

    @GetMapping("/pieces/{idPieceDepot}/telecharger")
    @PreAuthorize("hasRole('EVALUATEUR')")
    public ResponseEntity<Resource> telechargerPiece(
            @PathVariable Long idPieceDepot) throws Exception {

        PieceDepot piece = service.trouverPiece(idPieceDepot);

        Path chemin = service.cheminFichier(
                piece.getCheminFichier());

        Resource resource = new UrlResource(chemin.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }

        String nom = piece.getNomFichier();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(nom)
                                .build()
                                .toString())
                .body(resource);
    }
}
