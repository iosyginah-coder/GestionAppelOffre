
package com.example.backend.service;

import com.example.backend.entity.*;
import com.example.backend.repository.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class OffreService {

    private static final long TAILLE_MAX = 10L * 1024 * 1024;

    private static final Set<String> EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx",
            "jpg", "jpeg", "png"
    );

    @PersistenceContext
    private EntityManager em;

    private final OffreRepository offreRepository;
    private final AppelOffreRepository appelOffreRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final PieceRequiseRepository pieceRepository;
    private final DocumentOffreRepository documentRepository;
    private final Path dossierUpload;

    public OffreService(
            OffreRepository offreRepository,
            AppelOffreRepository appelOffreRepository,
            UtilisateurRepository utilisateurRepository,
            PieceRequiseRepository pieceRepository,
            DocumentOffreRepository documentRepository,
            @Value("${app.upload.dir:uploads}") String dossier
    ) {
        this.offreRepository = offreRepository;
        this.appelOffreRepository = appelOffreRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.pieceRepository = pieceRepository;
        this.documentRepository = documentRepository;
        this.dossierUpload = Paths.get(dossier)
                .toAbsolutePath()
                .normalize();
    }

    private ResponseStatusException erreur(
            HttpStatus statut,
            String message
    ) {
        return new ResponseStatusException(statut, message);
    }

    // =====================================================
    // RECUPERER LE SOUMISSIONNAIRE CONNECTE
    // =====================================================

    private Utilisateur soumissionnaireConnecte() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        if (auth == null
                || !auth.isAuthenticated()
                || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {

            throw erreur(
                    HttpStatus.UNAUTHORIZED,
                    "Vous devez être connecté."
            );
        }

        String matricule = auth.getPrincipal().toString();

        Utilisateur user = utilisateurRepository
                .findByMatricule(matricule)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable."
                ));

        if (!"SOUMISSIONNAIRE".equalsIgnoreCase(user.getRole())) {
            throw erreur(
                    HttpStatus.FORBIDDEN,
                    "Seul un soumissionnaire peut déposer une offre."
            );
        }

        if (!"ACTIF".equalsIgnoreCase(user.getStatut())) {
            throw erreur(
                    HttpStatus.FORBIDDEN,
                    "Votre compte n'est pas actif."
            );
        }

        return user;
    }

    // =====================================================
    // AFFICHER LES OFFRES DU SOUMISSIONNAIRE CONNECTE
    // =====================================================

    @Transactional(readOnly = true)
    public List<Offre> mesOffres() {

        Utilisateur user = soumissionnaireConnecte();

        return offreRepository
                .findByUtilisateurOrderByIdOffreDesc(user);
    }

    // =====================================================
    // DEPOSER UNE OFFRE
    // =====================================================

    public Offre deposer(
            Long idAppelOffre,
            BigDecimal montant,
            List<Long> idsPieces,
            List<MultipartFile> fichiers
    ) {

        Utilisateur soumissionnaire = soumissionnaireConnecte();

        if (idAppelOffre == null) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "L'appel d'offres est obligatoire."
            );
        }

        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Le montant proposé doit être supérieur à zéro."
            );
        }

        AppelOffre appel = appelOffreRepository
                .findById(idAppelOffre)
                .orElseThrow(() -> erreur(
                        HttpStatus.NOT_FOUND,
                        "Appel d'offres introuvable."
                ));

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Cet appel d'offres n'est pas ouvert aux dépôts."
            );
        }

        if (appel.getDateLimiteDepot() == null
                || !appel.getDateLimiteDepot().isAfter(LocalDateTime.now())) {

            throw erreur(
                    HttpStatus.CONFLICT,
                    "La date limite de dépôt est dépassée."
            );
        }

        if (offreRepository.existsByAppelOffreAndUtilisateur(
                appel,
                soumissionnaire
        )) {
            throw erreur(
                    HttpStatus.CONFLICT,
                    "Vous avez déjà déposé une offre pour cet appel d'offres."
            );
        }

        // Récupérer les pièces requises pour cet appel d'offres
        List<PieceRequise> pieces =
                pieceRepository.findByAppelOffre_IdAppelOffre(idAppelOffre);

        List<Long> ids = idsPieces == null
                ? Collections.emptyList()
                : idsPieces;

        List<MultipartFile> fics = fichiers == null
                ? Collections.emptyList()
                : fichiers;

        if (ids.size() != fics.size()) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Les fichiers ne correspondent pas aux pièces indiquées."
            );
        }

        // Associer chaque pièce à son fichier
        Map<Long, MultipartFile> parPiece = new LinkedHashMap<>();

        for (int i = 0; i < ids.size(); i++) {

            Long idPiece = ids.get(i);
            MultipartFile fichier = fics.get(i);

            if (idPiece == null) {
                throw erreur(
                        HttpStatus.BAD_REQUEST,
                        "Identifiant de pièce invalide."
                );
            }

            PieceRequise piece = pieces.stream()
                    .filter(p -> p.getIdPiece().equals(idPiece))
                    .findFirst()
                    .orElseThrow(() -> erreur(
                            HttpStatus.BAD_REQUEST,
                            "Une pièce envoyée n'appartient pas à cet appel d'offres."
                    ));

            if (parPiece.containsKey(idPiece)) {
                throw erreur(
                        HttpStatus.BAD_REQUEST,
                        "La pièce " + piece.getNomPiece()
                                + " a été envoyée deux fois."
                );
            }

            validerFichier(fichier, piece.getNomPiece());
            parPiece.put(idPiece, fichier);
        }

        // Vérifier que toutes les pièces obligatoires sont présentes
        for (PieceRequise piece : pieces) {

            if (Boolean.TRUE.equals(piece.getObligatoire())
                    && !parPiece.containsKey(piece.getIdPiece())) {

                throw erreur(
                        HttpStatus.BAD_REQUEST,
                        "La pièce obligatoire "
                                + piece.getNomPiece()
                                + " est manquante."
                );
            }
        }

        // Créer l'offre
        Offre offre = new Offre();

        offre.setMontant(montant);
        offre.setAppelOffre(appel);
        offre.setUtilisateur(soumissionnaire);
        offre.setStatut("DEPOSEE");

        offre.setAccuseDeReception(
                "AR-" + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 12)
                        .toUpperCase(Locale.ROOT)
        );

        offre = offreRepository.saveAndFlush(offre);

        // Récupérer la date générée par PostgreSQL
        em.refresh(offre);

        Path dossier = dossierUpload
                .resolve("offres")
                .resolve(offre.getAccuseDeReception())
                .normalize();

        if (!dossier.startsWith(dossierUpload)) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Chemin de stockage invalide."
            );
        }

        try {

            Files.createDirectories(dossier);

            for (Map.Entry<Long, MultipartFile> entree
                    : parPiece.entrySet()) {

                MultipartFile fichier = entree.getValue();

                PieceRequise piece = pieces.stream()
                        .filter(p -> p.getIdPiece().equals(entree.getKey()))
                        .findFirst()
                        .orElseThrow(() -> erreur(
                                HttpStatus.BAD_REQUEST,
                                "Pièce requise introuvable."
                        ));

                String original =
                        nettoyerNom(fichier.getOriginalFilename());

                String stocke =
                        UUID.randomUUID() + "." + extension(original);

                Path cible = dossier.resolve(stocke).normalize();

                if (!cible.startsWith(dossier)) {
                    throw erreur(
                            HttpStatus.BAD_REQUEST,
                            "Nom de fichier invalide."
                    );
                }

                try (InputStream in = fichier.getInputStream()) {
                    Files.copy(
                            in,
                            cible,
                            StandardCopyOption.REPLACE_EXISTING
                    );
                }

                // Enregistrer le document lié à l'offre et à la pièce
                DocumentOffre doc = new DocumentOffre();

                doc.setOffre(offre);
                doc.setPieceRequise(piece);
                doc.setTypeDocument("PIECE");
                doc.setNomFichier(original);
                doc.setChemin(
                        "offres/"
                                + offre.getAccuseDeReception()
                                + "/"
                                + stocke
                );

                documentRepository.save(doc);
            }

            documentRepository.flush();

        } catch (IOException e) {

            supprimerDossier(dossier);

            throw erreur(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible d'enregistrer les fichiers de l'offre."
            );

        } catch (RuntimeException e) {

            supprimerDossier(dossier);
            throw e;
        }

        return offre;
    }

    // =====================================================
    // VALIDATION DES FICHIERS
    // =====================================================

    private void validerFichier(
            MultipartFile fichier,
            String nomPiece
    ) {

        if (fichier == null || fichier.isEmpty()) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Le fichier de la pièce " + nomPiece + " est vide."
            );
        }

        if (fichier.getSize() > TAILLE_MAX) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Le fichier de la pièce " + nomPiece
                            + " dépasse 10 Mo."
            );
        }

        String nom = nettoyerNom(fichier.getOriginalFilename());
        String ext = extension(nom);

        if (!EXTENSIONS.contains(ext)) {
            throw erreur(
                    HttpStatus.BAD_REQUEST,
                    "Format non autorisé pour " + nomPiece
                            + ". Formats acceptés : PDF, Word, Excel, JPG et PNG."
            );
        }
    }

    // =====================================================
    // NETTOYER LE NOM DU FICHIER
    // =====================================================

    private String nettoyerNom(String nom) {

        if (nom == null || nom.isBlank()) {
            return "document";
        }

        String n = nom.replace("\\", "/");

        n = n.substring(n.lastIndexOf('/') + 1);

        n = n.replaceAll(
                "[^\\p{L}\\p{N} ._()\\-]",
                "_"
        ).trim();

        if (n.isEmpty()) {
            n = "document";
        }

        return n.length() > 200
                ? n.substring(n.length() - 200)
                : n;
    }

    // =====================================================
    // EXTRAIRE L'EXTENSION
    // =====================================================

    private String extension(String nom) {

        int i = nom.lastIndexOf('.');

        return i < 0
                ? ""
                : nom.substring(i + 1).toLowerCase(Locale.ROOT);
    }

    // =====================================================
    // SUPPRIMER LES FICHIERS EN CAS D'ERREUR
    // =====================================================

    private void supprimerDossier(Path dossier) {

        try {

            if (Files.exists(dossier)) {

                try (var flux = Files.walk(dossier)) {

                    flux.sorted(Comparator.reverseOrder())
                            .forEach(p -> {
                                try {
                                    Files.deleteIfExists(p);
                                } catch (IOException ignored) {
                                    // Ignorer une erreur de suppression isolée
                                }
                            });
                }
            }

        } catch (IOException ignored) {
            // Ignorer une erreur de nettoyage
        }
    }
}
