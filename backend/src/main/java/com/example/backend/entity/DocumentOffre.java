package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
    @JoinColumn(name = "id_offre", nullable = true)
    private Offre offre;

    public Long getIdDocument() { return idDocument; }
    public void setIdDocument(Long value) { this.idDocument = value; }

    public String getTypeDocument() { return typeDocument; }
    public void setTypeDocument(String value) { this.typeDocument = value; }

    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String value) { this.nomFichier = value; }

    public String getChemin() { return chemin; }
    public void setChemin(String value) { this.chemin = value; }

    public Offre getOffre() { return offre; }
    public void setOffre(Offre value) { this.offre = value; }

}
