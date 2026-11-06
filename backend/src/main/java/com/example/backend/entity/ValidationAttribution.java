package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "validation_attribution")
public class ValidationAttribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_validation")
    private Long idValidation;

    @Column(name = "niveau", nullable = false)
    private Integer niveau;

    @Column(name = "decision", nullable = false, length = 10)
    private String decision;

    @Column(name = "commentaire", columnDefinition = "text")
    private String commentaire;

    @Column(name = "date_validation", nullable = false, insertable = false, updatable = false)
    private LocalDateTime dateValidation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_offre", nullable = true)
    private Offre offre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = true)
    private Utilisateur utilisateur;

    public Long getIdValidation() { return idValidation; }
    public void setIdValidation(Long value) { this.idValidation = value; }

    public Integer getNiveau() { return niveau; }
    public void setNiveau(Integer value) { this.niveau = value; }

    public String getDecision() { return decision; }
    public void setDecision(String value) { this.decision = value; }

    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String value) { this.commentaire = value; }

    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime value) { this.dateValidation = value; }

    public Offre getOffre() { return offre; }
    public void setOffre(Offre value) { this.offre = value; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur value) { this.utilisateur = value; }

}
