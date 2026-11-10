
package com.example.backend.service;

import com.example.backend.entity.*;
import com.example.backend.repository.*;

import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EvaluationService {

    private final OffreRepository offreRepository;
    private final DocumentOffreRepository documentRepository;
    private final NoterRepository noterRepository;
    private final AppelOffreCritereRepository appelOffreCritereRepository;
    private final UtilisateurRepository utilisateurRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public EvaluationService(
            OffreRepository offreRepository,
            DocumentOffreRepository documentRepository,
            NoterRepository noterRepository,
            AppelOffreCritereRepository appelOffreCritereRepository,
            UtilisateurRepository utilisateurRepository
    ) {
        this.offreRepository = offreRepository;
        this.documentRepository = documentRepository;
        this.noterRepository = noterRepository;
        this.appelOffreCritereRepository = appelOffreCritereRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    // =====================================================
    // UTILISATEUR CONNECTE
    // =====================================================

    private Utilisateur evaluateurConnecte() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Utilisateur non connecté."
            );
        }

        String matricule = authentication.getName();

        Utilisateur utilisateur =
                utilisateurRepository.findByMatricule(matricule)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Évaluateur introuvable."
                                )
                        );

        if (utilisateur.getRole() == null
                || !"EVALUATEUR".equalsIgnoreCase(
                utilisateur.getRole().toString()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Accès réservé aux évaluateurs."
            );
        }

        if (utilisateur.getStatut() != null
                && !"ACTIF".equalsIgnoreCase(
                utilisateur.getStatut().toString()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Votre compte est suspendu."
            );
        }

        return utilisateur;
    }

    // =====================================================
    // LISTE DES OFFRES A EVALUER
    // =====================================================

    public List<OffreEvaluationDto> listerOffresPourEvaluation() {

        evaluateurConnecte();

        return offreRepository.findAll()
                .stream()
                .filter(offre -> {

                    String statut = offre.getStatut() == null
                            ? ""
                            : offre.getStatut();

                    return statut.equalsIgnoreCase("DEPOSEE")
                            || statut.equalsIgnoreCase("EN_EVALUATION")
                            || statut.equalsIgnoreCase("EVALUEE");
                })
                .sorted(
                        Comparator.comparing(
                                Offre::getIdOffre,
                                Comparator.nullsLast(
                                        Comparator.reverseOrder()
                                )
                        )
                )
                .map(this::convertirOffre)
                .toList();
    }

    private OffreEvaluationDto convertirOffre(Offre offre) {

        OffreEvaluationDto dto = new OffreEvaluationDto();

        dto.setIdOffre(offre.getIdOffre());
        dto.setMontant(offre.getMontant());
        dto.setAccuseDeReception(offre.getAccuseDeReception());
        dto.setStatut(offre.getStatut());

        if (offre.getAppelOffre() != null) {

            dto.setIdAppelOffre(
                    offre.getAppelOffre().getIdAppelOffre()
            );

            dto.setReferenceAppelOffre(
                    offre.getAppelOffre().getReference()
            );

            dto.setObjetAppelOffre(
                    offre.getAppelOffre().getObjet()
            );
        }

        if (offre.getUtilisateur() != null) {

            dto.setNomSoumissionnaire(
                    offre.getUtilisateur().getNomComplet()
            );

            dto.setMatriculeSoumissionnaire(
                    offre.getUtilisateur().getMatricule()
            );
        }

        return dto;
    }

    // =====================================================
    // DOCUMENTS D'UNE OFFRE
    // =====================================================

    public List<DocumentDto> listerDocuments(Long offreId) {

        evaluateurConnecte();

        Offre offre = offreRepository.findById(offreId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Offre introuvable."
                        )
                );

        return documentRepository
                .findByOffre_IdOffreOrderByIdDocumentAsc(
                        offre.getIdOffre()
                )
                .stream()
                .map(this::convertirDocument)
                .toList();
    }

    private DocumentDto convertirDocument(
            DocumentOffre document
    ) {

        DocumentDto dto = new DocumentDto();

        dto.setIdDocument(document.getIdDocument());
        dto.setTypeDocument(document.getTypeDocument());
        dto.setNomFichier(document.getNomFichier());

        if (document.getOffre() != null) {
            dto.setIdOffre(
                    document.getOffre().getIdOffre()
            );
        }

        if (document.getPieceRequise() != null) {
            dto.setIdPiece(
                    document.getPieceRequise().getIdPiece()
            );
        }

        return dto;
    }

    // =====================================================
    // TELECHARGEMENT D'UN DOCUMENT
    // =====================================================

    public FichierTelechargement telechargerDocument(
            Long documentId
    ) {

        evaluateurConnecte();

        DocumentOffre document =
                documentRepository.findById(documentId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Document introuvable."
                                )
                        );

        if (document.getChemin() == null
                || document.getChemin().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Chemin du document introuvable."
            );
        }

        try {

            Path base = Paths.get(uploadDir)
                    .toAbsolutePath()
                    .normalize();

            Path fichier = base.resolve(document.getChemin())
                    .normalize();

            if (!fichier.startsWith(base)) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Chemin de fichier invalide."
                );
            }

            if (!Files.exists(fichier)
                    || !Files.isRegularFile(fichier)) {

                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Le fichier demandé n'existe pas sur le serveur."
                );
            }

            byte[] contenu = Files.readAllBytes(fichier);

            String nom = document.getNomFichier();

            if (nom == null || nom.isBlank()) {
                nom = fichier.getFileName().toString();
            }

            return new FichierTelechargement(
                    nom,
                    contenu
            );

        } catch (IOException e) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur pendant le téléchargement du document."
            );
        }
    }

    // =====================================================
    // CONSULTATION DES NOTES
    // =====================================================

    public List<NoteDto> listerNotes(Long offreId) {

        evaluateurConnecte();

        if (!offreRepository.existsById(offreId)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Offre introuvable."
            );
        }

        return noterRepository
                .findByOffre_IdOffreOrderByIdNoterAsc(offreId)
                .stream()
                .map(this::convertirNote)
                .toList();
    }

    private NoteDto convertirNote(Noter noter) {

        NoteDto dto = new NoteDto();

        dto.setIdNoter(noter.getIdNoter());
        dto.setNote(noter.getNote());
        dto.setCommentaire(noter.getCommentaire());

        if (noter.getCritere() != null) {

            dto.setIdCritere(
                    noter.getCritere().getIdCritere()
            );

            dto.setNomCritere(
                    noter.getCritere().getNomCritere()
            );
        }

        if (noter.getUtilisateur() != null) {

            dto.setNomEvaluateur(
                    noter.getUtilisateur().getNomComplet()
            );
        }

        return dto;
    }

    // =====================================================
    // ENREGISTRER UNE EVALUATION
    // =====================================================

    @Transactional
    public EvaluationResultatDto enregistrerEvaluation(
            EvaluationRequest request
    ) {

        Utilisateur evaluateur = evaluateurConnecte();

        if (request == null
                || request.getIdOffre() == null
                || request.getNotes() == null
                || request.getNotes().isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de l'évaluation sont obligatoires."
            );
        }

        Offre offre = offreRepository.findById(
                request.getIdOffre()
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Offre introuvable."
                )
        );

        if (offre.getAppelOffre() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cette offre n'est liée à aucun appel d'offres."
            );
        }

        List<AppelOffreCritere> criteres =
                appelOffreCritereRepository
                        .findByAppelOffre_IdAppelOffre(
                                offre.getAppelOffre()
                                        .getIdAppelOffre()
                        );

        if (criteres.isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Aucun critère d'évaluation n'est configuré pour cet appel d'offres."
            );
        }

        Map<Long, AppelOffreCritere> criteresAutorises =
                criteres.stream()
                        .collect(Collectors.toMap(
                                c -> c.getCritere().getIdCritere(),
                                c -> c
                        ));

        Set<Long> idsRecus = new HashSet<>();

        for (NoteRequest noteRequest : request.getNotes()) {

            if (noteRequest == null
                    || noteRequest.getIdCritere() == null
                    || noteRequest.getNote() == null) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Chaque note doit contenir un critère et une valeur."
                );
            }

            if (!idsRecus.add(noteRequest.getIdCritere())) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Un critère ne peut pas être noté deux fois."
                );
            }

            if (!criteresAutorises.containsKey(
                    noteRequest.getIdCritere()
            )) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Ce critère n'appartient pas à cet appel d'offres."
                );
            }

            if (noteRequest.getNote() == null
                    || noteRequest.getNote().compareTo(BigDecimal.ZERO) < 0
                    || noteRequest.getNote().compareTo(new BigDecimal("20")) > 0) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "La note doit être comprise entre 0 et 20."
                );
            }
        }

        for (NoteRequest noteRequest : request.getNotes()) {

            CritereEvaluation critere =
                    criteresAutorises.get(
                            noteRequest.getIdCritere()
                    ).getCritere();

            Optional<Noter> noteExistante =
                    noterRepository
                            .findByOffre_IdOffreAndCritere_IdCritereAndUtilisateur_IdUtilisateur(
                                    offre.getIdOffre(),
                                    critere.getIdCritere(),
                                    evaluateur.getIdUtilisateur()
                            );

            Noter noter = noteExistante.orElseGet(Noter::new);

            noter.setOffre(offre);
            noter.setCritere(critere);
            noter.setUtilisateur(evaluateur);

            noter.setNote(
                    noteRequest.getNote().setScale(
                            2,
                            RoundingMode.HALF_UP
                    )
            );

            noter.setCommentaire(
                    noteRequest.getCommentaire()
            );

            noterRepository.save(noter);
        }

        List<Noter> notesEvaluateur =
                noterRepository
                        .findByOffre_IdOffreAndUtilisateur_IdUtilisateur(
                                offre.getIdOffre(),
                                evaluateur.getIdUtilisateur()
                        );

        Set<Long> criteresNotes =
                notesEvaluateur.stream()
                        .filter(n -> n.getCritere() != null)
                        .map(n -> n.getCritere().getIdCritere())
                        .collect(Collectors.toSet());

        boolean evaluationComplete =
                criteresAutorises.keySet()
                        .stream()
                        .allMatch(criteresNotes::contains);

        // CORRECTION : ton entité Offre utilise String statut
        offre.setStatut(
                evaluationComplete
                        ? "EVALUEE"
                        : "EN_EVALUATION"
        );

        offreRepository.save(offre);

        EvaluationResultatDto resultat =
                new EvaluationResultatDto();

        resultat.setMessage(
                "Évaluation enregistrée avec succès."
        );

        resultat.setIdOffre(offre.getIdOffre());

        resultat.setNombreNotesEnregistrees(
                request.getNotes().size()
        );

        resultat.setEvaluationComplete(
                evaluationComplete
        );

        return resultat;
    }

    // =====================================================
    // DTO OFFRE
    // =====================================================

    public static class OffreEvaluationDto {

        private Long idOffre;
        private BigDecimal montant;
        private String accuseDeReception;
        private String statut;
        private Long idAppelOffre;
        private String referenceAppelOffre;
        private String objetAppelOffre;
        private String nomSoumissionnaire;
        private String matriculeSoumissionnaire;

        public Long getIdOffre() { return idOffre; }
        public void setIdOffre(Long v) { idOffre = v; }

        public BigDecimal getMontant() { return montant; }
        public void setMontant(BigDecimal v) { montant = v; }

        public String getAccuseDeReception() { return accuseDeReception; }
        public void setAccuseDeReception(String v) { accuseDeReception = v; }

        public String getStatut() { return statut; }
        public void setStatut(String v) { statut = v; }

        public Long getIdAppelOffre() { return idAppelOffre; }
        public void setIdAppelOffre(Long v) { idAppelOffre = v; }

        public String getReferenceAppelOffre() { return referenceAppelOffre; }
        public void setReferenceAppelOffre(String v) { referenceAppelOffre = v; }

        public String getObjetAppelOffre() { return objetAppelOffre; }
        public void setObjetAppelOffre(String v) { objetAppelOffre = v; }

        public String getNomSoumissionnaire() { return nomSoumissionnaire; }
        public void setNomSoumissionnaire(String v) { nomSoumissionnaire = v; }

        public String getMatriculeSoumissionnaire() { return matriculeSoumissionnaire; }
        public void setMatriculeSoumissionnaire(String v) { matriculeSoumissionnaire = v; }
    }

    // =====================================================
    // DTO DOCUMENT
    // =====================================================

    public static class DocumentDto {

        private Long idDocument;
        private String typeDocument;
        private String nomFichier;
        private Long idOffre;
        private Long idPiece;

        public Long getIdDocument() { return idDocument; }
        public void setIdDocument(Long v) { idDocument = v; }

        public String getTypeDocument() { return typeDocument; }
        public void setTypeDocument(String v) { typeDocument = v; }

        public String getNomFichier() { return nomFichier; }
        public void setNomFichier(String v) { nomFichier = v; }

        public Long getIdOffre() { return idOffre; }
        public void setIdOffre(Long v) { idOffre = v; }

        public Long getIdPiece() { return idPiece; }
        public void setIdPiece(Long v) { idPiece = v; }
    }

    // =====================================================
    // DTO NOTE
    // =====================================================

    public static class NoteDto {

        private Long idNoter;
        private Long idCritere;
        private String nomCritere;
        private BigDecimal note;
        private String commentaire;
        private String nomEvaluateur;

        public Long getIdNoter() { return idNoter; }
        public void setIdNoter(Long v) { idNoter = v; }

        public Long getIdCritere() { return idCritere; }
        public void setIdCritere(Long v) { idCritere = v; }

        public String getNomCritere() { return nomCritere; }
        public void setNomCritere(String v) { nomCritere = v; }

        public BigDecimal getNote() { return note; }
        public void setNote(BigDecimal v) { note = v; }

        public String getCommentaire() { return commentaire; }
        public void setCommentaire(String v) { commentaire = v; }

        public String getNomEvaluateur() { return nomEvaluateur; }
        public void setNomEvaluateur(String v) { nomEvaluateur = v; }
    }

    // =====================================================
    // REQUETE EVALUATION
    // =====================================================

    public static class EvaluationRequest {

        private Long idOffre;
        private List<NoteRequest> notes;

        public Long getIdOffre() { return idOffre; }
        public void setIdOffre(Long v) { idOffre = v; }

        public List<NoteRequest> getNotes() { return notes; }
        public void setNotes(List<NoteRequest> v) { notes = v; }
    }

    public static class NoteRequest {

        private Long idCritere;
        private BigDecimal note;
        private String commentaire;

        public Long getIdCritere() { return idCritere; }
        public void setIdCritere(Long v) { idCritere = v; }

        public BigDecimal getNote() { return note; }
        public void setNote(BigDecimal v) { note = v; }

        public String getCommentaire() { return commentaire; }
        public void setCommentaire(String v) { commentaire = v; }
    }

    // =====================================================
    // RESULTAT EVALUATION
    // =====================================================

    public static class EvaluationResultatDto {

        private String message;
        private Long idOffre;
        private int nombreNotesEnregistrees;
        private boolean evaluationComplete;

        public String getMessage() { return message; }
        public void setMessage(String v) { message = v; }

        public Long getIdOffre() { return idOffre; }
        public void setIdOffre(Long v) { idOffre = v; }

        public int getNombreNotesEnregistrees() {
            return nombreNotesEnregistrees;
        }

        public void setNombreNotesEnregistrees(int v) {
            nombreNotesEnregistrees = v;
        }

        public boolean isEvaluationComplete() {
            return evaluationComplete;
        }

        public void setEvaluationComplete(boolean v) {
            evaluationComplete = v;
        }
    }

    // =====================================================
    // FICHIER A TELECHARGER
    // =====================================================

    public record FichierTelechargement(
            String nomFichier,
            byte[] contenu
    ) {}
}
