package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    public Long getIdPiece() { return idPiece; }
    public void setIdPiece(Long value) { this.idPiece = value; }

    public String getNomPiece() { return nomPiece; }
    public void setNomPiece(String value) { this.nomPiece = value; }

    public String getDescription() { return description; }
    public void setDescription(String value) { this.description = value; }

}
