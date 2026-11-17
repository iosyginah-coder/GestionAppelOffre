
package com.example.backend.service;

import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.PieceRequise;
import com.example.backend.repository.AppelOffreRepository;
import com.example.backend.repository.PieceRequiseRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class PieceRequiseService {

    private final PieceRequiseRepository pieceRepository;
    private final AppelOffreRepository appelOffreRepository;

    public PieceRequiseService(
            PieceRequiseRepository pieceRepository,
            AppelOffreRepository appelOffreRepository
    ) {
        this.pieceRepository = pieceRepository;
        this.appelOffreRepository = appelOffreRepository;
    }

    // =========================================
    // AFFICHER TOUTES LES PIECES
    // =========================================

    @Transactional(readOnly = true)
    public List<PieceRequise> obtenirToutes() {
        return pieceRepository.findAll();
    }

    // =========================================
    // AFFICHER LES PIECES POUR LE RESPONSABLE
    // =========================================

    @Transactional(readOnly = true)
    public List<PieceRequise> obtenirParAppelOffre(
            Long idAppelOffre
    ) {
        verifierId(idAppelOffre);

        verifierAppelOffre(idAppelOffre);

        return pieceRepository
                .findByAppelOffre_IdAppelOffreOrderByIdPieceAsc(
                        idAppelOffre
                );
    }

    // =========================================
    // AFFICHER LES PIECES PUBLIQUES
    // UNIQUEMENT SI L'AO EST PUBLIE
    // =========================================

    @Transactional(readOnly = true)
    public List<PieceRequise> obtenirPiecesPubliques(
            Long idAppelOffre
    ) {
        verifierId(idAppelOffre);

        AppelOffre appelOffre = verifierAppelOffre(idAppelOffre);

        if (appelOffre.getStatut() == null
                || !"PUBLIE".equalsIgnoreCase(
                appelOffre.getStatut()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Cet appel d'offres n'est pas disponible publiquement."
            );
        }

        return pieceRepository
                .findByAppelOffre_IdAppelOffreOrderByIdPieceAsc(
                        idAppelOffre
                );
    }

    // =========================================
    // AFFICHER UNE PIECE PAR ID
    // =========================================

    @Transactional(readOnly = true)
    public PieceRequise obtenirParId(Long id) {

        verifierId(id);

        return pieceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Pièce requise introuvable."
                ));
    }

    // =========================================
    // AJOUTER UNE PIECE REQUISE
    // =========================================

    public PieceRequise ajouter(
            Long idAppelOffre,
            PieceRequise piece
    ) {

        verifierId(idAppelOffre);

        if (piece == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de la pièce sont obligatoires."
            );
        }

        AppelOffre appelOffre =
                verifierAppelOffre(idAppelOffre);

        verifierAppelOffreModifiable(appelOffre);

        if (piece.getNomPiece() == null
                || piece.getNomPiece().trim().isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom de la pièce est obligatoire."
            );
        }

        piece.setIdPiece(null);
        piece.setNomPiece(piece.getNomPiece().trim());
        piece.setAppelOffre(appelOffre);

        if (piece.getObligatoire() == null) {
            piece.setObligatoire(true);
        }

        return pieceRepository.save(piece);
    }

    // =========================================
    // MODIFIER UNE PIECE REQUISE
    // =========================================

    public PieceRequise modifier(
            Long id,
            PieceRequise donnees
    ) {

        verifierId(id);

        if (donnees == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Les informations de la pièce sont obligatoires."
            );
        }

        PieceRequise piece = obtenirParId(id);

        verifierAppelOffreModifiable(piece.getAppelOffre());

        if (donnees.getNomPiece() == null
                || donnees.getNomPiece().trim().isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le nom de la pièce est obligatoire."
            );
        }

        piece.setNomPiece(donnees.getNomPiece().trim());
        piece.setDescription(donnees.getDescription());

        if (donnees.getObligatoire() != null) {
            piece.setObligatoire(donnees.getObligatoire());
        }

        return pieceRepository.save(piece);
    }

    // =========================================
    // SUPPRIMER UNE PIECE REQUISE
    // =========================================

    public void supprimer(Long id) {

        verifierId(id);

        PieceRequise piece = obtenirParId(id);

        verifierAppelOffreModifiable(piece.getAppelOffre());

        pieceRepository.delete(piece);
    }

    // =========================================
    // VERIFIER L'EXISTENCE D'UN APPEL D'OFFRES
    // =========================================

    private AppelOffre verifierAppelOffre(Long id) {

        return appelOffreRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Appel d'offres introuvable."
                ));
    }

    // =========================================
    // VERIFIER SI L'APPEL D'OFFRES EST MODIFIABLE
    // =========================================

    private void verifierAppelOffreModifiable(
            AppelOffre appelOffre
    ) {

        if (appelOffre == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Appel d'offres introuvable."
            );
        }

        if ("PUBLIE".equalsIgnoreCase(appelOffre.getStatut())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Impossible de modifier les pièces d'un appel d'offres déjà publié."
            );
        }
    }

    // =========================================
    // VERIFIER UN IDENTIFIANT
    // =========================================

    private void verifierId(Long id) {

        if (id == null || id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identifiant invalide."
            );
        }
    }
}
