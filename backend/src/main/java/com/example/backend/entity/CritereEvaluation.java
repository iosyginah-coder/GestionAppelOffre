package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "critere_evaluation")
public class CritereEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_critere")
    private Long idCritere;

    @Column(name = "nom_critere", nullable = false, length = 150)
    private String nomCritere;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "ponderation", nullable = false, precision = 5, scale = 2)
    private BigDecimal ponderation;

    public Long getIdCritere() { return idCritere; }
    public void setIdCritere(Long value) { this.idCritere = value; }

    public String getNomCritere() { return nomCritere; }
    public void setNomCritere(String value) { this.nomCritere = value; }

    public String getDescription() { return description; }
    public void setDescription(String value) { this.description = value; }

    public BigDecimal getPonderation() { return ponderation; }
    public void setPonderation(BigDecimal value) { this.ponderation = value; }

}
