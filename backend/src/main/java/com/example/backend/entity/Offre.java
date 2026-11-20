
package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "offre")
public class Offre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_offre")
    private Long idOffre;

    // FOURNISSEUR ou PRESTATAIRE
    @Column(name = "type_soumissionnaire", nullable = false, length = 30)
    private String typeSoumissionnaire;

    @Column(name = "accuse_de_reception", nullable = false, unique = true, length = 60)
    private String accuseDeReception;

    @Column(name = "date_depot", nullable = false)
    private LocalDateTime dateDepot;

    @Column(name = "statut", nullable = false, length = 30)
    private String statut = "DEPOSEE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre", nullable = false)
    private AppelOffre appelOffre;

    // Dépôt public : aucun compte utilisateur obligatoire
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur")
    private Utilisateur utilisateur;

    // Informations fournisseur
    @Column(name = "entreprise", length = 200)
    private String entreprise;

    @Column(name = "nif", length = 80)
    private String nif;

    @Column(name = "stat", length = 80)
    private String stat;

    @Column(name = "adresse_entreprise", length = 300)
    private String adresseEntreprise;

    // Informations prestataire
    @Column(name = "nom_soumissionnaire", length = 150)
    private String nomSoumissionnaire;

    @Column(name = "adresse_soumissionnaire", length = 300)
    private String adresseSoumissionnaire;

    @Column(name = "cin_recto", length = 500)
    private String cinRecto;

    @Column(name = "cin_verso", length = 500)
    private String cinVerso;

    // Informations communes
    @Column(name = "email_soumissionnaire", length = 150)
    private String emailSoumissionnaire;

    @Column(name = "telephone_soumissionnaire", length = 30)
    private String telephoneSoumissionnaire;

    // Offres facultatives
    @Column(name = "offre_technique", length = 500)
    private String offreTechnique;

    @Column(name = "offre_financiere", length = 500)
    private String offreFinanciere;

    // GETTERS ET SETTERS

    public Long getIdOffre() {
        return idOffre;
    }

    public void setIdOffre(Long idOffre) {
        this.idOffre = idOffre;
    }

    public String getTypeSoumissionnaire() {
        return typeSoumissionnaire;
    }

    public void setTypeSoumissionnaire(String typeSoumissionnaire) {
        this.typeSoumissionnaire = typeSoumissionnaire;
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

    public String getEntreprise() {
        return entreprise;
    }

    public void setEntreprise(String entreprise) {
        this.entreprise = entreprise;
    }

    public String getNif() {
        return nif;
    }

    public void setNif(String nif) {
        this.nif = nif;
    }

    public String getStat() {
        return stat;
    }

    public void setStat(String stat) {
        this.stat = stat;
    }

    public String getAdresseEntreprise() {
        return adresseEntreprise;
    }

    public void setAdresseEntreprise(String adresseEntreprise) {
        this.adresseEntreprise = adresseEntreprise;
    }

    public String getNomSoumissionnaire() {
        return nomSoumissionnaire;
    }

    public void setNomSoumissionnaire(String nomSoumissionnaire) {
        this.nomSoumissionnaire = nomSoumissionnaire;
    }

    public String getAdresseSoumissionnaire() {
        return adresseSoumissionnaire;
    }

    public void setAdresseSoumissionnaire(String adresseSoumissionnaire) {
        this.adresseSoumissionnaire = adresseSoumissionnaire;
    }

    public String getCinRecto() {
        return cinRecto;
    }

    public void setCinRecto(String cinRecto) {
        this.cinRecto = cinRecto;
    }

    public String getCinVerso() {
        return cinVerso;
    }

    public void setCinVerso(String cinVerso) {
        this.cinVerso = cinVerso;
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

    public String getOffreTechnique() {
        return offreTechnique;
    }

    public void setOffreTechnique(String offreTechnique) {
        this.offreTechnique = offreTechnique;
    }

    public String getOffreFinanciere() {
        return offreFinanciere;
    }

    public void setOffreFinanciere(String offreFinanciere) {
        this.offreFinanciere = offreFinanciere;
    }
}
