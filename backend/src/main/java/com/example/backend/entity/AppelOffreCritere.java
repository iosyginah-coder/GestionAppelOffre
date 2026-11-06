package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "appel_offre_critere")
public class AppelOffreCritere {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_appel_offre_critere")
    private Long idAppelOffreCritere;

    @Column(name = "ponderation", nullable = false, precision = 5, scale = 2)
    private BigDecimal ponderation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre", nullable = true)
    private AppelOffre appelOffre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_critere", nullable = true)
    private CritereEvaluation critere;

    public Long getIdAppelOffreCritere() { return idAppelOffreCritere; }
    public void setIdAppelOffreCritere(Long value) { this.idAppelOffreCritere = value; }

    public BigDecimal getPonderation() { return ponderation; }
    public void setPonderation(BigDecimal value) { this.ponderation = value; }

    public AppelOffre getAppelOffre() { return appelOffre; }
    public void setAppelOffre(AppelOffre value) { this.appelOffre = value; }

    public CritereEvaluation getCritere() { return critere; }
    public void setCritere(CritereEvaluation value) { this.critere = value; }

}
