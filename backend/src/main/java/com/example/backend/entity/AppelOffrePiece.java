
package com.example.backend.entity;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "appel_offre_piece")
@IdClass(AppelOffrePieceId.class)
public class AppelOffrePiece implements Serializable {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre")
    private AppelOffre appelOffre;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_piece")
    private PieceRequise piece;

    public AppelOffrePiece() {
    }

    public AppelOffre getAppelOffre() {
        return appelOffre;
    }

    public void setAppelOffre(AppelOffre appelOffre) {
        this.appelOffre = appelOffre;
    }

    public PieceRequise getPiece() {
        return piece;
    }

    public void setPiece(PieceRequise piece) {
        this.piece = piece;
    }
}
