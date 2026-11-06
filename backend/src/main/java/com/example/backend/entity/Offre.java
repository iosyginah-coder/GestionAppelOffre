package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "offre")
public class Offre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_offre")
    private Long idOffre;

    @Column(name = "montant", nullable = false, precision = 15, scale = 2)
    private BigDecimal montant;

    @Column(name = "accuse_de_reception", nullable = false, unique = true, length = 60)
    private String accuseDeReception;

    @Column(name = "date_depot", nullable = false, insertable = false, updatable = false)
    private LocalDateTime dateDepot;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre", nullable = true)
    private AppelOffre appelOffre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = true)
    private Utilisateur utilisateur;

    public Long getIdOffre() { return idOffre; }
    public void setIdOffre(Long value) { this.idOffre = value; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal value) { this.montant = value; }

    public String getAccuseDeReception() { return accuseDeReception; }
    public void setAccuseDeReception(String value) { this.accuseDeReception = value; }

    public LocalDateTime getDateDepot() { return dateDepot; }
    public void setDateDepot(LocalDateTime value) { this.dateDepot = value; }

    public String getStatut() { return statut; }
    public void setStatut(String value) { this.statut = value; }

    public AppelOffre getAppelOffre() { return appelOffre; }
    public void setAppelOffre(AppelOffre value) { this.appelOffre = value; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur value) { this.utilisateur = value; }

}
