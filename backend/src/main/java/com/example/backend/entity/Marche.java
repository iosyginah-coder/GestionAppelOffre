package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "marche")
public class Marche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_marche")
    private Long idMarche;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut;

    @Column(name = "date_attribution", nullable = false, insertable = false, updatable = false)
    private LocalDateTime dateAttribution;

    @Column(name = "avancement", nullable = false)
    private Integer avancement;

    @Column(name = "alerte", nullable = false, length = 20)
    private String alerte;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_offre", nullable = true)
    private Offre offre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = true)
    private Utilisateur utilisateur;

    public Long getIdMarche() { return idMarche; }
    public void setIdMarche(Long value) { this.idMarche = value; }

    public String getStatut() { return statut; }
    public void setStatut(String value) { this.statut = value; }

    public LocalDateTime getDateAttribution() { return dateAttribution; }
    public void setDateAttribution(LocalDateTime value) { this.dateAttribution = value; }

    public Integer getAvancement() { return avancement; }
    public void setAvancement(Integer value) { this.avancement = value; }

    public String getAlerte() { return alerte; }
    public void setAlerte(String value) { this.alerte = value; }

    public Offre getOffre() { return offre; }
    public void setOffre(Offre value) { this.offre = value; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur value) { this.utilisateur = value; }

}
