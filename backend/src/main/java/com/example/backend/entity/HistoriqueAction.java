package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "historique_action")
public class HistoriqueAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historique")
    private Long idHistorique;

    @Column(name = "action", nullable = false, length = 255)
    private String action;

    @Column(name = "date_action", nullable = false, insertable = false, updatable = false)
    private LocalDateTime dateAction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = true)
    private Utilisateur utilisateur;

    public Long getIdHistorique() { return idHistorique; }
    public void setIdHistorique(Long value) { this.idHistorique = value; }

    public String getAction() { return action; }
    public void setAction(String value) { this.action = value; }

    public LocalDateTime getDateAction() { return dateAction; }
    public void setDateAction(LocalDateTime value) { this.dateAction = value; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur value) { this.utilisateur = value; }

}
