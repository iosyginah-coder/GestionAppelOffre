package com.example.backend.entity;

import java.io.Serializable;
import java.util.Objects;

public class AppelOffrePieceId implements Serializable {
    private Long appelOffre;
    private Long piece;

    public AppelOffrePieceId() {}
    public AppelOffrePieceId(Long appelOffre, Long piece) {
        this.appelOffre = appelOffre;
        this.piece = piece;
    }
    public Long getAppelOffre() { return appelOffre; }
    public void setAppelOffre(Long appelOffre) { this.appelOffre = appelOffre; }
    public Long getPiece() { return piece; }
    public void setPiece(Long piece) { this.piece = piece; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AppelOffrePieceId that)) return false;
        return Objects.equals(appelOffre, that.appelOffre) && Objects.equals(piece, that.piece);
    }
    @Override public int hashCode() { return Objects.hash(appelOffre, piece); }
}
