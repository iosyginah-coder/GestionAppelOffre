package com.example.backend.controller;

import com.example.backend.entity.PhotoAppelOffre;
import com.example.backend.service.PhotoAppelOffreService;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api")
public class PhotoAppelOffreController {

    private final PhotoAppelOffreService service;

    public PhotoAppelOffreController(PhotoAppelOffreService service) {
        this.service = service;
    }

    /** Représentation JSON d'une photo (avec l'URL d'accès au fichier). */
    public record PhotoDto(
            Long idPhoto,
            String nomFichier,
            String typeContenu,
            Long taille,
            LocalDateTime dateAjout,
            String url
    ) {
        static PhotoDto de(PhotoAppelOffre p, boolean publique) {
            String url = publique
                    ? "/api/photos/public/" + p.getIdPhoto()
                    : "/api/photos/" + p.getIdPhoto();

            return new PhotoDto(
                    p.getIdPhoto(),
                    p.getNomFichier(),
                    p.getTypeContenu(),
                    p.getTaille(),
                    p.getDateAjout(),
                    url
            );
        }
    }

    // =========================================
    // RESPONSABLE DES MARCHES
    // =========================================

    // Ajouter une photo (multipart/form-data, champ "file")
    @PostMapping(
            value = "/appel-offres/{idAppel}/photos",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<PhotoDto> ajouter(
            @PathVariable Long idAppel,
            @RequestParam("file") MultipartFile file) {

        PhotoAppelOffre photo = service.ajouter(idAppel, file);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(PhotoDto.de(photo, false));
    }

    // Lister les photos d'un appel d'offres
    @GetMapping("/appel-offres/{idAppel}/photos")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<List<PhotoDto>> lister(
            @PathVariable Long idAppel) {

        return ResponseEntity.ok(
                service.lister(idAppel, false).stream()
                        .map(p -> PhotoDto.de(p, false))
                        .toList()
        );
    }

    // Supprimer une photo (brouillon uniquement)
    @DeleteMapping("/appel-offres/{idAppel}/photos/{idPhoto}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<Void> supprimer(
            @PathVariable Long idAppel,
            @PathVariable Long idPhoto) {

        service.supprimer(idAppel, idPhoto);
        return ResponseEntity.noContent().build();
    }

    // Afficher le fichier d'une photo
    @GetMapping("/photos/{idPhoto}")
    @PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
    public ResponseEntity<Resource> fichier(@PathVariable Long idPhoto) {
        return reponseFichier(service.obtenirFichier(idPhoto, false));
    }

    // =========================================
    // CONSULTATION PUBLIQUE (appels PUBLIE uniquement)
    // =========================================

    @GetMapping("/appel-offres/publications/{idAppel}/photos")
    public ResponseEntity<List<PhotoDto>> listerPubliques(
            @PathVariable Long idAppel) {

        return ResponseEntity.ok(
                service.lister(idAppel, true).stream()
                        .map(p -> PhotoDto.de(p, true))
                        .toList()
        );
    }

    @GetMapping("/photos/public/{idPhoto}")
    public ResponseEntity<Resource> fichierPublic(
            @PathVariable Long idPhoto) {

        return reponseFichier(service.obtenirFichier(idPhoto, true));
    }

    private ResponseEntity<Resource> reponseFichier(
            PhotoAppelOffreService.FichierPhoto f) {

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.typeContenu()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate())
                .body(f.ressource());
    }
}
