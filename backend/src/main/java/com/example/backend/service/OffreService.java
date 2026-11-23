
package com.example.backend.service;

import com.example.backend.dto.OffreEvaluationDto;
import com.example.backend.dto.OffreEvaluationDto.AppelDto;
import com.example.backend.dto.OffreEvaluationDto.DocumentDto;
import com.example.backend.entity.*;
import com.example.backend.repository.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class OffreService {

    private final OffreRepository offreRepository;
    private final AppelOffreRepository appelOffreRepository;
    private final PieceRequiseRepository pieceRequiseRepository;
    private final PieceDepotRepository pieceDepotRepository;

    @Value("${app.upload.dir:uploads/offres}")
    private String uploadDir;

    public OffreService(
            OffreRepository offreRepository,
            AppelOffreRepository appelOffreRepository,
            PieceRequiseRepository pieceRequiseRepository,
            PieceDepotRepository pieceDepotRepository) {

        this.offreRepository = offreRepository;
        this.appelOffreRepository = appelOffreRepository;
        this.pieceRequiseRepository = pieceRequiseRepository;
        this.pieceDepotRepository = pieceDepotRepository;
    }

    // =========================================================
    // DEPOT PUBLIC D'UNE OFFRE PAR LE SOUMISSIONNAIRE
    // =========================================================

    @Transactional
    public Offre deposer(
            Long idAppelOffre,
            String typeSoumissionnaire,
            String nomSoumissionnaire,
            String entreprise,
            String email,
            String telephone,
            String adresse,
            String nif,
            String stat,
            MultipartFile cinRecto,
            MultipartFile cinVerso,
            MultipartFile offreTechnique,
            MultipartFile offreFinanciere,
            List<Long> idsPieces,
            List<MultipartFile> fichiersPieces) {

        if (idAppelOffre == null) {
            throw new IllegalArgumentException(
                    "Appel d'offres obligatoire.");
        }

        AppelOffre appel = appelOffreRepository.findById(idAppelOffre)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Appel d'offres introuvable."));

        if (!"PUBLIE".equalsIgnoreCase(appel.getStatut())) {
            throw new IllegalStateException(
                    "Cet appel d'offres n'est pas ouvert aux dépôts.");
        }

        if (appel.getDateLimiteDepot() == null ||
                !LocalDateTime.now().isBefore(appel.getDateLimiteDepot())) {
            throw new IllegalStateException(
                    "La date limite de dépôt est dépassée.");
        }

        if (typeSoumissionnaire == null) {
            throw new IllegalArgumentException(
                    "Type de soumissionnaire obligatoire.");
        }

        typeSoumissionnaire =
                typeSoumissionnaire.trim().toUpperCase(Locale.ROOT);

        if (!typeSoumissionnaire.equals("FOURNISSEUR") &&
                !typeSoumissionnaire.equals("PRESTATAIRE")) {
            throw new IllegalArgumentException(
                    "Type de soumissionnaire invalide.");
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Adresse email obligatoire.");
        }

        Offre offre = new Offre();

        offre.setAppelOffre(appel);
        offre.setTypeSoumissionnaire(typeSoumissionnaire);
        offre.setEmailSoumissionnaire(email.trim());
        offre.setTelephoneSoumissionnaire(telephone);
        offre.setDateDepot(LocalDateTime.now());

        // L'offre est immédiatement disponible pour l'évaluateur.
        offre.setStatut("DEPOSEE");

        // Informations fournisseur
        if (typeSoumissionnaire.equals("FOURNISSEUR")) {

            if (entreprise == null || entreprise.isBlank()) {
                throw new IllegalArgumentException(
                        "Nom de l'entreprise obligatoire.");
            }

            if (adresse == null || adresse.isBlank()) {
                throw new IllegalArgumentException(
                        "Adresse de l'entreprise obligatoire.");
            }

            if (nif == null || nif.isBlank() ||
                    stat == null || stat.isBlank()) {
                throw new IllegalArgumentException(
                        "NIF et STAT obligatoires.");
            }

            offre.setEntreprise(entreprise.trim());
            offre.setAdresseEntreprise(adresse.trim());
            offre.setNif(nif.trim());
            offre.setStat(stat.trim());

        } else {

            // Informations prestataire
            if (nomSoumissionnaire == null ||
                    nomSoumissionnaire.isBlank()) {
                throw new IllegalArgumentException(
                        "Nom et prénom obligatoires.");
            }

            if (adresse == null || adresse.isBlank()) {
                throw new IllegalArgumentException(
                        "Adresse obligatoire.");
            }

            verifierFichierObligatoire(cinRecto, "CIN recto");
            verifierFichierObligatoire(cinVerso, "CIN verso");

            offre.setNomSoumissionnaire(nomSoumissionnaire.trim());
            offre.setAdresseSoumissionnaire(adresse.trim());
            offre.setCinRecto(stockerFichier(cinRecto, "cin"));
            offre.setCinVerso(stockerFichier(cinVerso, "cin"));
        }

        // Récupération des pièces requises pour cet appel d'offres
        List<PieceRequise> piecesAttendues =
                pieceRequiseRepository
                        .findByAppelOffre_IdAppelOffreOrderByIdPieceAsc(
                                idAppelOffre);

        Map<Long, MultipartFile> fichiersParPiece = new HashMap<>();

        if (idsPieces != null && fichiersPieces != null) {

            if (idsPieces.size() != fichiersPieces.size()) {
                throw new IllegalArgumentException(
                        "Chaque pièce doit correspondre à un fichier.");
            }

            for (int i = 0; i < idsPieces.size(); i++) {

                Long idPiece = idsPieces.get(i);
                MultipartFile fichier = fichiersPieces.get(i);

                if (idPiece == null ||
                        fichiersParPiece.put(idPiece, fichier) != null) {
                    throw new IllegalArgumentException(
                            "Pièce requise répétée ou invalide.");
                }
            }
        }

        Set<Long> idsAutorises = new HashSet<>();

        for (PieceRequise piece : piecesAttendues) {

            idsAutorises.add(piece.getIdPiece());

            MultipartFile fichier =
                    fichiersParPiece.get(piece.getIdPiece());

            if (Boolean.TRUE.equals(piece.getObligatoire()) &&
                    (fichier == null || fichier.isEmpty())) {
                throw new IllegalArgumentException(
                        "Pièce obligatoire manquante : "
                                + piece.getNomPiece());
            }
        }

        if (!idsAutorises.containsAll(fichiersParPiece.keySet())) {
            throw new IllegalArgumentException(
                    "Une pièce envoyée ne correspond pas à cet appel d'offres.");
        }

        // Génération de l'accusé de réception
        String accuse = "DEP-" +
                UUID.randomUUID().toString()
                        .replace("-", "")
                        .substring(0, 20)
                        .toUpperCase(Locale.ROOT);

        offre.setAccuseDeReception(accuse);

        // Enregistrement de l'offre
        offre = offreRepository.save(offre);

        // Enregistrement des pièces déposées
        for (PieceRequise piece : piecesAttendues) {

            MultipartFile fichier =
                    fichiersParPiece.get(piece.getIdPiece());

            if (fichier == null || fichier.isEmpty()) {
                continue;
            }

            PieceDepot depot = new PieceDepot();

            depot.setOffre(offre);
            depot.setPieceRequise(piece);
            depot.setNomFichier(nomOriginal(fichier));
            depot.setCheminFichier(stockerFichier(fichier, "pieces"));
            depot.setTypeContenu(fichier.getContentType());
            depot.setDateAjout(LocalDateTime.now());

            pieceDepotRepository.save(depot);
        }

        // Fichiers facultatifs du fournisseur
        if (typeSoumissionnaire.equals("FOURNISSEUR")) {

            if (offreTechnique != null && !offreTechnique.isEmpty()) {
                offre.setOffreTechnique(
                        stockerFichier(offreTechnique, "technique"));
            }

            if (offreFinanciere != null && !offreFinanciere.isEmpty()) {
                offre.setOffreFinanciere(
                        stockerFichier(offreFinanciere, "financiere"));
            }

            offre = offreRepository.save(offre);
        }

        return offre;
    }

    // =========================================================
    // VERIFICATION DES FICHIERS
    // =========================================================

    private void verifierFichierObligatoire(
            MultipartFile fichier, String nom) {

        if (fichier == null || fichier.isEmpty()) {
            throw new IllegalArgumentException(nom + " obligatoire.");
        }

        verifierFichier(fichier);
    }

    private String nomOriginal(MultipartFile fichier) {

        String nom = fichier.getOriginalFilename();

        if (nom == null || nom.isBlank()) {
            return "document";
        }

        return Paths.get(nom).getFileName().toString();
    }

    // =========================================================
    // STOCKAGE DES FICHIERS
    // =========================================================

    private String stockerFichier(
            MultipartFile fichier, String categorie) {

        if (fichier == null || fichier.isEmpty()) {
            return null;
        }

        verifierFichier(fichier);

        try {
            Path dossier = Paths.get(uploadDir, categorie)
                    .toAbsolutePath()
                    .normalize();

            Files.createDirectories(dossier);

            String extension = "";
            String original = nomOriginal(fichier);
            int point = original.lastIndexOf('.');

            if (point >= 0) {
                extension = original.substring(point)
                        .replaceAll("[^a-zA-Z0-9.]", "");
            }

            String nomStocke = UUID.randomUUID() + extension;

            Path destination = dossier.resolve(nomStocke).normalize();

            if (!destination.startsWith(dossier)) {
                throw new IllegalArgumentException(
                        "Nom de fichier invalide.");
            }

            Files.copy(
                    fichier.getInputStream(),
                    destination,
                    StandardCopyOption.REPLACE_EXISTING);

            return categorie + "/" + nomStocke;

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Impossible d'enregistrer le fichier.", e);
        }
    }

    private void verifierFichier(MultipartFile fichier) {

        if (fichier.getSize() > 10L * 1024 * 1024) {
            throw new IllegalArgumentException(
                    "Chaque fichier doit faire au maximum 10 Mo.");
        }

        String nom = nomOriginal(fichier).toLowerCase(Locale.ROOT);

        if (!(nom.endsWith(".pdf") ||
                nom.endsWith(".jpg") ||
                nom.endsWith(".jpeg") ||
                nom.endsWith(".png"))) {
            throw new IllegalArgumentException(
                    "Formats autorisés : PDF, JPG, JPEG et PNG.");
        }
    }

    // =========================================================
    // NOUVEAU : LISTE DES OFFRES POUR LES EVALUATEURS
    // =========================================================

    @Transactional(readOnly = true)
    public List<OffreEvaluationDto> listerOffresPourEvaluation() {

        return offreRepository.findByStatutInOrderByDateDepotDesc(
                        List.of("DEPOSEE", "EN_EVALUATION", "EVALUEE"))
                .stream()
                .map(this::versDto)
                .toList();
    }

    private OffreEvaluationDto versDto(Offre o) {

        AppelOffre a = o.getAppelOffre();

        AppelDto appel = a == null ? null : new AppelDto(
                a.getIdAppelOffre(),
                a.getReference(),
                a.getObjet(),
                a.getDescription(),
                a.getLieuExecution(),
                a.getDateLimiteDepot());

        boolean fournisseur =
                "FOURNISSEUR".equalsIgnoreCase(o.getTypeSoumissionnaire());

        String adresse = fournisseur
                ? o.getAdresseEntreprise()
                : o.getAdresseSoumissionnaire();

        String nomAffiche = fournisseur
                ? o.getEntreprise()
                : o.getNomSoumissionnaire();

        if (nomAffiche == null || nomAffiche.isBlank()) {
            nomAffiche = "Soumissionnaire";
        }

        return new OffreEvaluationDto(
                o.getIdOffre(),
                o.getAccuseDeReception(),
                o.getStatut(),
                o.getDateDepot(),
                o.getTypeSoumissionnaire(),
                nomAffiche,
                o.getNomSoumissionnaire(),
                o.getEntreprise(),
                o.getNif(),
                o.getStat(),
                adresse,
                o.getEmailSoumissionnaire(),
                o.getTelephoneSoumissionnaire(),
                appel);
    }

    // =========================================================
    // LISTE DE TOUTES LES OFFRES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Offre> listerToutesLesOffres() {

        return offreRepository.findAllByOrderByDateDepotDesc();
    }

    // =========================================================
    // LISTE DES OFFRES PAR APPEL D'OFFRES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Offre> listerParAppel(Long idAppelOffre) {

        return offreRepository
                .findByAppelOffre_IdAppelOffreOrderByDateDepotDesc(
                        idAppelOffre);
    }

    // =========================================================
    // LISTE DES PIECES DEPOSEES
    // =========================================================

    @Transactional(readOnly = true)
    public List<PieceDepot> listerPieces(Long idOffre) {

        return pieceDepotRepository
                .findByOffre_IdOffreOrderByIdPieceDepotAsc(idOffre);
    }

    // =========================================================
    // RECHERCHER UNE PIECE DEPOSEE
    // =========================================================

    @Transactional(readOnly = true)
    public PieceDepot trouverPiece(Long idPieceDepot) {

        return pieceDepotRepository.findById(idPieceDepot)
                .orElseThrow(() ->
                        new IllegalArgumentException("Fichier introuvable."));
    }

    // =========================================================
    // RECUPERER LE CHEMIN D'UN FICHIER
    // =========================================================

    public Path cheminFichier(String cheminRelatif) {

        Path base = Paths.get(uploadDir)
                .toAbsolutePath()
                .normalize();

        Path chemin = base.resolve(cheminRelatif).normalize();

        if (!chemin.startsWith(base)) {
            throw new IllegalArgumentException(
                    "Chemin de fichier invalide.");
        }

        return chemin;
    }

    // =========================================================
    // TOUS LES DOCUMENTS D'UN DOSSIER
    // =========================================================

    @Transactional(readOnly = true)
    public List<DocumentDto> listerDocuments(Long idOffre) {

        Offre o = offreRepository.findById(idOffre)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Offre introuvable."));

        List<DocumentDto> docs = new ArrayList<>();

        ajouterFichier(docs, "cin-recto", "Identité", "CIN (recto)", o.getCinRecto());
        ajouterFichier(docs, "cin-verso", "Identité", "CIN (verso)", o.getCinVerso());
        ajouterFichier(docs, "technique", "Offre", "Offre technique", o.getOffreTechnique());
        ajouterFichier(docs, "financiere", "Offre", "Offre financière", o.getOffreFinanciere());

        for (PieceDepot p : pieceDepotRepository
                .findByOffre_IdOffreOrderByIdPieceDepotAsc(idOffre)) {

            docs.add(new DocumentDto(
                    "piece-" + p.getIdPieceDepot(),
                    "Pièce requise",
                    p.getPieceRequise() != null
                            ? p.getPieceRequise().getNomPiece()
                            : "Pièce",
                    p.getNomFichier(),
                    p.getTypeContenu()));
        }

        return docs;
    }

    private void ajouterFichier(List<DocumentDto> docs, String cle,
                                String categorie, String libelle,
                                String chemin) {

        if (chemin == null || chemin.isBlank()) return;

        String nom = chemin.substring(chemin.lastIndexOf('/') + 1);

        docs.add(new DocumentDto(cle, categorie, libelle, nom,
                typeParExtension(nom)));
    }

    // =========================================================
    // TELECHARGEMENT / APERCU D'UN DOCUMENT
    // =========================================================

    public record FichierOffre(Path chemin, String nom, String typeContenu) {}

    @Transactional(readOnly = true)
    public FichierOffre fichierDocument(Long idOffre, String cle) {

        Offre o = offreRepository.findById(idOffre)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Offre introuvable."));

        String relatif;
        String nom;
        String type;

        if (cle.startsWith("piece-")) {

            Long idPiece;

            try {
                idPiece = Long.valueOf(cle.substring(6));
            } catch (NumberFormatException e) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Document invalide.");
            }

            PieceDepot p = pieceDepotRepository.findById(idPiece)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Document introuvable."));

            // Sécurité : la pièce doit appartenir à cette offre
            if (p.getOffre() == null
                    || !p.getOffre().getIdOffre().equals(idOffre)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Document non autorisé.");
            }

            relatif = p.getCheminFichier();
            nom = p.getNomFichier();
            type = p.getTypeContenu();

        } else {

            relatif = switch (cle) {
                case "cin-recto" -> o.getCinRecto();
                case "cin-verso" -> o.getCinVerso();
                case "technique" -> o.getOffreTechnique();
                case "financiere" -> o.getOffreFinanciere();
                default -> null;
            };

            if (relatif == null || relatif.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Document introuvable.");
            }

            String fichier = relatif.substring(relatif.lastIndexOf('/') + 1);
            int point = fichier.lastIndexOf('.');

            nom = cle + "-" + idOffre + (point >= 0 ? fichier.substring(point) : "");
            type = typeParExtension(fichier);
        }

        Path chemin = cheminFichier(relatif);

        if (!Files.isRegularFile(chemin)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Le fichier n'existe pas sur le serveur.");
        }

        if (type == null || type.isBlank()) {
            type = typeParExtension(nom);
        }

        return new FichierOffre(chemin, nom, type);
    }

    private String typeParExtension(String nom) {

        String n = nom == null ? "" : nom.toLowerCase(Locale.ROOT);

        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";

        return "application/octet-stream";
    }
}
