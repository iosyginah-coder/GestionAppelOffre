package com.example.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "appel_offre_piece")
@IdClass(AppelOffrePieceId.class)
public class AppelOffrePiece {
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre", nullable = false)
    private AppelOffre appelOffre;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_piece", nullable = false)
    private PieceRequise piece;

    public AppelOffre getAppelOffre() { return appelOffre; }
    public void setAppelOffre(AppelOffre appelOffre) { this.appelOffre = appelOffre; }
    public PieceRequise getPiece() { return piece; }
    public void setPiece(PieceRequise piece) { this.piece = piece; }
}
