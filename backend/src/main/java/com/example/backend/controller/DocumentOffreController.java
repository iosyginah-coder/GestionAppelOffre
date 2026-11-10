
package com.example.backend.controller;

import com.example.backend.service.EvaluationService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/documents-offre")
@PreAuthorize("hasRole('EVALUATEUR')")
public class DocumentOffreController {

    private final EvaluationService evaluationService;

    public DocumentOffreController(
            EvaluationService evaluationService
    ) {
        this.evaluationService = evaluationService;
    }

    // Afficher les documents déposés pour une offre
    @GetMapping("/offre/{offreId}")
    public ResponseEntity<List<EvaluationService.DocumentDto>>
    documentsParOffre(@PathVariable Long offreId) {

        return ResponseEntity.ok(
                evaluationService.listerDocuments(offreId)
        );
    }

    // Télécharger un document d'une offre
    @GetMapping("/{id}/telecharger")
    public ResponseEntity<Resource> telecharger(
            @PathVariable Long id
    ) {

        EvaluationService.FichierTelechargement fichier =
                evaluationService.telechargerDocument(id);

        ByteArrayResource resource =
                new ByteArrayResource(fichier.contenu());

        ContentDisposition disposition =
                ContentDisposition.attachment()
                        .filename(
                                fichier.nomFichier(),
                                StandardCharsets.UTF_8
                        )
                        .build();

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        disposition.toString()
                )
                .contentLength(fichier.contenu().length)
                .body(resource);
    }
}
