package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "noter")
public class Noter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_noter")
    private Long idNoter;

    @Column(name = "note", nullable = false, precision = 4, scale = 2)
    private BigDecimal note;

    @Column(name = "commentaire", columnDefinition = "text")
    private String commentaire;

    @Column(name = "date_note", nullable = false, insertable = false, updatable = false)
    private LocalDateTime dateNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = true)
    private Utilisateur utilisateur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_offre", nullable = true)
    private Offre offre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_critere", nullable = true)
    private CritereEvaluation critere;

    public Long getIdNoter() { return idNoter; }
    public void setIdNoter(Long value) { this.idNoter = value; }

    public BigDecimal getNote() { return note; }
    public void setNote(BigDecimal value) { this.note = value; }

    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String value) { this.commentaire = value; }

    public LocalDateTime getDateNote() { return dateNote; }
    public void setDateNote(LocalDateTime value) { this.dateNote = value; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur value) { this.utilisateur = value; }

    public Offre getOffre() { return offre; }
    public void setOffre(Offre value) { this.offre = value; }

    public CritereEvaluation getCritere() { return critere; }
    public void setCritere(CritereEvaluation value) { this.critere = value; }

}
