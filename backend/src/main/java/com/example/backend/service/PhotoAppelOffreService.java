package com.example.backend.service;

import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.PhotoAppelOffre;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.repository.PhotoAppelOffreRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PhotoAppelOffreService {

    public static final int MAX_PHOTOS = 10;
    public static final long TAILLE_MAX = 5L * 1024 * 1024; // 5 Mo

    /** Fichier prêt à être renvoyé au navigateur. */
    public record FichierPhoto(
            Resource ressource,
            String typeContenu,
            String nomFichier
    ) {
    }

    private final PhotoAppelOffreRepository photoRepository;
    private final AppelOffreRepository appelOffreRepository;
    private final Path dossierUpload;

    public PhotoAppelOffreService(
            PhotoAppelOffreRepository photoRepository,
            AppelOffreRepository appelOffreRepository,
            @Value("${app.upload.dir:uploads}") String dossier
    ) {
        this.photoRepository = photoRepository;
        this.appelOffreRepository = appelOffreRepository;
        this.dossierUpload = Paths.get(dossier)
                .toAbsolutePath()
                .normalize();
    }

    private ResponseStatusException erreur(HttpStatus statut, String message) {
        return new ResponseStatusException(statut, message);
    }

    private AppelOffre trouverAppel(Long id) {
        if (id == null || id <= 0) {
            throw erreur(HttpStatus.BAD_REQUEST, "Identifiant invalide.");
        }

        return appelOffreRepository.findById(id)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Appel d'offres introuvable."
                ));
    }

    private void verifierBrouillon(AppelOffre appel) {
        if (!"BROUILLON".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Les photos ne peuvent être modifiées que sur un brouillon."
            );
        }
    }

    // =====================================================
    // LISTE
    // =====================================================

    @Transactional(readOnly = true)
    public List<PhotoAppelOffre> lister(Long idAppel, boolean publicSeulement) {

        AppelOffre appel = trouverAppel(idAppel);

        if (publicSeulement
                && !"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.NOT_FOUND,
                    "Cet appel d'offres n'est pas disponible publiquement."
            );
        }

        return photoRepository
                .findByAppelOffre_IdAppelOffreOrderByIdPhotoAsc(idAppel);
    }

    // =====================================================
    // AJOUT
    // =====================================================

    public PhotoAppelOffre ajouter(Long idAppel, MultipartFile fichier) {

        AppelOffre appel = trouverAppel(idAppel);
        verifierBrouillon(appel);

        if (fichier == null || fichier.isEmpty()) {
            throw erreur(HttpStatus.BAD_REQUEST, "Aucun fichier reçu.");
        }

        if (fichier.getSize() > TAILLE_MAX) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "La photo dépasse la taille maximale de 5 Mo."
            );
        }

        if (photoRepository.countByAppelOffre_IdAppelOffre(idAppel)
                >= MAX_PHOTOS) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Maximum " + MAX_PHOTOS + " photos par appel d'offres."
            );
        }

        byte[] octets;

        try {
            octets = fichier.getBytes();
        } catch (IOException e) {
            throw erreur(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible de lire le fichier envoyé."
            );
        }

        // Le type est déterminé par le contenu réel, pas par le nom du fichier.
        String type = detecterType(octets);

        if (type == null) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Le fichier n'est pas une image valide (JPEG, PNG, GIF ou WebP)."
            );
        }

        String stocke = UUID.randomUUID() + "." + extension(type);

        Path dossier = dossierUpload
                .resolve("appels")
                .resolve(String.valueOf(idAppel))
                .normalize();

        Path cible = dossier.resolve(stocke).normalize();

        if (!dossier.startsWith(dossierUpload) || !cible.startsWith(dossier)) {
            throw erreur(HttpStatus.BAD_REQUEST, "Chemin de stockage invalide.");
        }

        try {
            Files.createDirectories(dossier);
            Files.write(cible, octets);
        } catch (IOException e) {
            throw erreur(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible d'enregistrer la photo."
            );
        }

        PhotoAppelOffre photo = new PhotoAppelOffre();
        photo.setAppelOffre(appel);
        photo.setNomFichier(nettoyerNom(fichier.getOriginalFilename()));
        photo.setChemin("appels/" + idAppel + "/" + stocke);
        photo.setTypeContenu(type);
        photo.setTaille((long) octets.length);

        try {
            return photoRepository.saveAndFlush(photo);
        } catch (RuntimeException e) {
            supprimerFichier(photo.getChemin());
            throw e;
        }
    }

    // =====================================================
    // SUPPRESSION
    // =====================================================

    public void supprimer(Long idAppel, Long idPhoto) {

        AppelOffre appel = trouverAppel(idAppel);
        verifierBrouillon(appel);

        PhotoAppelOffre photo = photoRepository
                .findByIdPhotoAndAppelOffre_IdAppelOffre(idPhoto, idAppel)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Photo introuvable."
                ));

        String chemin = photo.getChemin();

        photoRepository.delete(photo);
        photoRepository.flush();

        supprimerFichier(chemin);
    }

    // Appelée à la suppression d'un brouillon
    public void supprimerToutes(Long idAppel) {

        List<PhotoAppelOffre> photos = photoRepository
                .findByAppelOffre_IdAppelOffreOrderByIdPhotoAsc(idAppel);

        List<String> chemins = photos.stream()
                .map(PhotoAppelOffre::getChemin)
                .toList();

        photoRepository.deleteAll(photos);
        photoRepository.flush();

        chemins.forEach(this::supprimerFichier);

        try {
            Files.deleteIfExists(
                    dossierUpload.resolve("appels")
                            .resolve(String.valueOf(idAppel))
                            .normalize()
            );
        } catch (IOException ignored) {
            // Dossier non vide ou déjà supprimé : sans importance
        }
    }

    // =====================================================
    // LECTURE DU FICHIER
    // =====================================================

    @Transactional(readOnly = true)
    public FichierPhoto obtenirFichier(Long idPhoto, boolean publicSeulement) {

        if (idPhoto == null || idPhoto <= 0) {
            throw erreur(HttpStatus.BAD_REQUEST, "Identifiant invalide.");
        }

        PhotoAppelOffre photo = photoRepository.findById(idPhoto)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Photo introuvable."
                ));

        if (publicSeulement
                && !"PUBLIE".equalsIgnoreCase(
                photo.getAppelOffre().getStatut())) {
            throw erreur(HttpStatus.NOT_FOUND, "Photo introuvable.");
        }

        Path chemin = dossierUpload.resolve(photo.getChemin()).normalize();

        if (!chemin.startsWith(dossierUpload) || !Files.isRegularFile(chemin)) {
            throw erreur(HttpStatus.NOT_FOUND, "Fichier introuvable.");
        }

        return new FichierPhoto(
                new FileSystemResource(chemin),
                photo.getTypeContenu(),
                photo.getNomFichier()
        );
    }

    // =====================================================
    // LECTURE DU CONTENU (utilisée pour l'envoi à Facebook)
    // =====================================================

    @Transactional(readOnly = true)
    public byte[] lireOctets(PhotoAppelOffre photo) {

        Path chemin = dossierUpload.resolve(photo.getChemin()).normalize();

        if (!chemin.startsWith(dossierUpload) || !Files.isRegularFile(chemin)) {
            throw erreur(HttpStatus.NOT_FOUND, "Fichier introuvable.");
        }

        try {
            return Files.readAllBytes(chemin);
        } catch (IOException e) {
            throw erreur(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible de lire la photo."
            );
        }
    }

    // =====================================================
    // OUTILS
    // =====================================================

    private void supprimerFichier(String cheminRelatif) {
        try {
            Path chemin = dossierUpload.resolve(cheminRelatif).normalize();

            if (chemin.startsWith(dossierUpload)) {
                Files.deleteIfExists(chemin);
            }
        } catch (IOException ignored) {
            // Une erreur de nettoyage ne doit pas bloquer l'opération
        }
    }

    private static String detecterType(byte[] b) {

        if (b.length >= 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        if (b.length >= 8
                && (b[0] & 0xFF) == 0x89
                && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A
                && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }

        if (b.length >= 6
                && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return "image/gif";
        }

        if (b.length >= 12
                && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }

        return null;
    }

    private static String extension(String type) {
        return switch (type) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            default -> "webp";
        };
    }

    private static String nettoyerNom(String original) {

        if (original == null || original.isBlank()) {
            return "photo";
        }

        String nom = original.replace('\\', '/');
        nom = nom.substring(nom.lastIndexOf('/') + 1);
        nom = nom.replaceAll("[\\p{Cntrl}]", "").trim();

        if (nom.isEmpty()) {
            return "photo";
        }

        return nom.length() > 255 ? nom.substring(0, 255) : nom;
    }
}
