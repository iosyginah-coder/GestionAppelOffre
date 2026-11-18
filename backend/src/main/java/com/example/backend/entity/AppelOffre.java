package com.example.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "appel_offre",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_appel_offre_reference",
                        columnNames = "reference"
                )
        }
)
@JsonIgnoreProperties({
        "hibernateLazyInitializer",
        "handler"
})
public class AppelOffre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_appel_offre")
    private Long idAppelOffre;

    // Référence saisie manuellement par le responsable (unique)
    @Column(name = "reference", nullable = false, length = 50)
    private String reference;

    @Column(name = "objet", nullable = false, length = 255)
    private String objet;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "lieu_execution", length = 255)
    private String lieuExecution;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "BROUILLON";

    @Column(name = "date_publication")
    private LocalDateTime datePublication;

    @Column(name = "date_limite_depot", nullable = false)
    private LocalDateTime dateLimiteDepot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur", nullable = false)
    @JsonIgnoreProperties({
            "motDePasse",
            "hibernateLazyInitializer",
            "handler"
    })
    private Utilisateur utilisateur;

    public AppelOffre() {
    }

    public Long getIdAppelOffre() {
        return idAppelOffre;
    }

    public void setIdAppelOffre(Long idAppelOffre) {
        this.idAppelOffre = idAppelOffre;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getObjet() {
        return objet;
    }

    public void setObjet(String objet) {
        this.objet = objet;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLieuExecution() {
        return lieuExecution;
    }

    public void setLieuExecution(String lieuExecution) {
        this.lieuExecution = lieuExecution;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDateTime getDatePublication() {
        return datePublication;
    }

    public void setDatePublication(LocalDateTime datePublication) {
        this.datePublication = datePublication;
    }

    public LocalDateTime getDateLimiteDepot() {
        return dateLimiteDepot;
    }

    public void setDateLimiteDepot(LocalDateTime dateLimiteDepot) {
        this.dateLimiteDepot = dateLimiteDepot;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }
}
