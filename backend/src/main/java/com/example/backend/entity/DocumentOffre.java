
package com.example.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "document_offre")
public class DocumentOffre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_document")
    private Long idDocument;

    @Column(name = "type_document", nullable = false, length = 20)
    private String typeDocument;

    @Column(name = "nom_fichier", nullable = false, length = 255)
    private String nomFichier;

    @Column(name = "chemin", nullable = false, length = 500)
    private String chemin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_offre")
    private Offre offre;

    // Pièce requise à laquelle correspond le fichier envoyé
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_piece")
    private PieceRequise pieceRequise;

    public Long getIdDocument() {
        return idDocument;
    }

    public void setIdDocument(Long idDocument) {
        this.idDocument = idDocument;
    }

    public String getTypeDocument() {
        return typeDocument;
    }

    public void setTypeDocument(String typeDocument) {
        this.typeDocument = typeDocument;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public void setNomFichier(String nomFichier) {
        this.nomFichier = nomFichier;
    }

    public String getChemin() {
        return chemin;
    }

    public void setChemin(String chemin) {
        this.chemin = chemin;
    }

    public Offre getOffre() {
        return offre;
    }

    public void setOffre(Offre offre) {
        this.offre = offre;
    }

    public PieceRequise getPieceRequise() {
        return pieceRequise;
    }

    public void setPieceRequise(PieceRequise pieceRequise) {
        this.pieceRequise = pieceRequise;
    }
}
