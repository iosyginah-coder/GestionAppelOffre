
package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "demande_reinitialisation")
public class DemandeReinitialisation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "matricule", nullable = false, length = 7)
    private String matricule;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 20)
    private StatutDemande statut = StatutDemande.EN_ATTENTE;

    @Column(name = "date_demande", nullable = false)
    private LocalDateTime dateDemande;

    @Column(name = "date_traitement")
    private LocalDateTime dateTraitement;

    // Initialisation automatique avant insertion en base

    @PrePersist
    public void avantEnregistrement() {

        if (dateDemande == null) {
            dateDemande = LocalDateTime.now();
        }

        if (statut == null) {
            statut = StatutDemande.EN_ATTENTE;
        }

        verifierMatricule();
    }

    // Vérification avant mise à jour

    @PreUpdate
    public void avantModification() {

        verifierMatricule();

        if (statut == null) {
            throw new IllegalStateException(
                    "Le statut de la demande est obligatoire."
            );
        }
    }

    private void verifierMatricule() {

        if (matricule == null
                || !matricule.trim().matches("\\d{7}")) {

            throw new IllegalStateException(
                    "Le matricule doit contenir exactement 7 chiffres."
            );
        }
    }

    // GETTERS ET SETTERS

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMatricule() {
        return matricule;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public StatutDemande getStatut() {
        return statut;
    }

    public void setStatut(StatutDemande statut) {
        this.statut = statut;
    }

    public LocalDateTime getDateDemande() {
        return dateDemande;
    }

    public void setDateDemande(LocalDateTime dateDemande) {
        this.dateDemande = dateDemande;
    }

    public LocalDateTime getDateTraitement() {
        return dateTraitement;
    }

    public void setDateTraitement(LocalDateTime dateTraitement) {
        this.dateTraitement = dateTraitement;
    }
}
