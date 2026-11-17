
package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
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
    @JoinColumn(name = "id_appel_offre", nullable = false)
    private AppelOffre appelOffre;

    // L'utilisateur est facultatif : le dépôt est public et anonyme.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = true)
    private Utilisateur utilisateur;

    @Column(name = "nom_soumissionnaire", length = 150)
    private String nomSoumissionnaire;

    @Column(name = "entreprise", length = 200)
    private String entreprise;

    @Column(name = "email_soumissionnaire", length = 150)
    private String emailSoumissionnaire;

    @Column(name = "telephone_soumissionnaire", length = 30)
    private String telephoneSoumissionnaire;

    public Long getIdOffre() {
        return idOffre;
    }

    public void setIdOffre(Long idOffre) {
        this.idOffre = idOffre;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public void setMontant(BigDecimal montant) {
        this.montant = montant;
    }

    public String getAccuseDeReception() {
        return accuseDeReception;
    }

    public void setAccuseDeReception(String accuseDeReception) {
        this.accuseDeReception = accuseDeReception;
    }

    public LocalDateTime getDateDepot() {
        return dateDepot;
    }

    public void setDateDepot(LocalDateTime dateDepot) {
        this.dateDepot = dateDepot;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public AppelOffre getAppelOffre() {
        return appelOffre;
    }

    public void setAppelOffre(AppelOffre appelOffre) {
        this.appelOffre = appelOffre;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getNomSoumissionnaire() {
        return nomSoumissionnaire;
    }

    public void setNomSoumissionnaire(String nomSoumissionnaire) {
        this.nomSoumissionnaire = nomSoumissionnaire;
    }

    public String getEntreprise() {
        return entreprise;
    }

    public void setEntreprise(String entreprise) {
        this.entreprise = entreprise;
    }

    public String getEmailSoumissionnaire() {
        return emailSoumissionnaire;
    }

    public void setEmailSoumissionnaire(String emailSoumissionnaire) {
        this.emailSoumissionnaire = emailSoumissionnaire;
    }

    public String getTelephoneSoumissionnaire() {
        return telephoneSoumissionnaire;
    }

    public void setTelephoneSoumissionnaire(String telephoneSoumissionnaire) {
        this.telephoneSoumissionnaire = telephoneSoumissionnaire;
    }
}
