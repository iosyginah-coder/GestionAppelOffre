package com.example.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contrat")
public class Contrat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_contrat")
    private Long idContrat;

    @Column(name = "numero", nullable = false, unique = true, length = 30)
    private String numero;

    // FOURNISSEUR ou PRESTATAIRE (copie du type de l'offre)
    @Column(name = "type_contrat", nullable = false, length = 20)
    private String typeContrat;

    @Column(name = "objet", nullable = false, columnDefinition = "text")
    private String objet;

    @Column(name = "montant", nullable = false, precision = 18, scale = 2)
    private BigDecimal montant;

    // Délai d'exécution : une valeur + une unité au choix (JOUR, MOIS ou ANNEE)
    @Column(name = "delai_valeur", nullable = false)
    private Integer delaiValeur;

    @Column(name = "delai_unite", nullable = false, length = 10)
    private String delaiUnite = "JOUR";

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_signature")
    private LocalDate dateSignature;

    @Column(name = "lieu_execution", length = 255)
    private String lieuExecution;

    @Column(name = "clauses", columnDefinition = "text")
    private String clauses;

    // BROUILLON ou SIGNE
    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "BROUILLON";

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_offre", nullable = false, unique = true)
    private Offre offre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur")
    private Utilisateur utilisateur;

    @PrePersist
    void avantInsertion() {
        if (dateCreation == null) dateCreation = LocalDateTime.now();
        if (statut == null) statut = "BROUILLON";
    }

    public Long getIdContrat() { return idContrat; }
    public void setIdContrat(Long v) { this.idContrat = v; }

    public String getNumero() { return numero; }
    public void setNumero(String v) { this.numero = v; }

    public String getTypeContrat() { return typeContrat; }
    public void setTypeContrat(String v) { this.typeContrat = v; }

    public String getObjet() { return objet; }
    public void setObjet(String v) { this.objet = v; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal v) { this.montant = v; }

    public Integer getDelaiValeur() { return delaiValeur; }
    public void setDelaiValeur(Integer v) { this.delaiValeur = v; }

    public String getDelaiUnite() { return delaiUnite; }
    public void setDelaiUnite(String v) { this.delaiUnite = v; }

    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate v) { this.dateDebut = v; }

    public LocalDate getDateSignature() { return dateSignature; }
    public void setDateSignature(LocalDate v) { this.dateSignature = v; }

    public String getLieuExecution() { return lieuExecution; }
    public void setLieuExecution(String v) { this.lieuExecution = v; }

    public String getClauses() { return clauses; }
    public void setClauses(String v) { this.clauses = v; }

    public String getStatut() { return statut; }
    public void setStatut(String v) { this.statut = v; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime v) { this.dateCreation = v; }

    public Offre getOffre() { return offre; }
    public void setOffre(Offre v) { this.offre = v; }

    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur v) { this.utilisateur = v; }
}
