
package com.example.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "piece_requise")
public class PieceRequise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_piece")
    private Long idPiece;

    @Column(name = "nom_piece", nullable = false, length = 150)
    private String nomPiece;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "obligatoire", nullable = false)
    private Boolean obligatoire = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre", nullable = false)
    @JsonIgnore
    private AppelOffre appelOffre;

    public PieceRequise() {
    }

    public Long getIdPiece() {
        return idPiece;
    }

    public void setIdPiece(Long idPiece) {
        this.idPiece = idPiece;
    }

    public String getNomPiece() {
        return nomPiece;
    }

    public void setNomPiece(String nomPiece) {
        this.nomPiece = nomPiece;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getObligatoire() {
        return obligatoire;
    }

    public void setObligatoire(Boolean obligatoire) {
        this.obligatoire = obligatoire;
    }

    public AppelOffre getAppelOffre() {
        return appelOffre;
    }

    public void setAppelOffre(AppelOffre appelOffre) {
        this.appelOffre = appelOffre;
    }
}
