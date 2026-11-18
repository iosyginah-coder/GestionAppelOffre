package com.example.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "photo_appel_offre")
public class PhotoAppelOffre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_photo")
    private Long idPhoto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_appel_offre", nullable = false)
    @JsonIgnore
    private AppelOffre appelOffre;

    @Column(name = "nom_fichier", nullable = false, length = 255)
    private String nomFichier;

    // Chemin relatif au dossier d'upload, ex. : appels/12/uuid.jpg
    @Column(name = "chemin", nullable = false, length = 500)
    @JsonIgnore
    private String chemin;

    @Column(name = "type_contenu", nullable = false, length = 100)
    private String typeContenu;

    @Column(name = "taille", nullable = false)
    private Long taille;

    @Column(name = "date_ajout", nullable = false, updatable = false)
    private LocalDateTime dateAjout;

    public PhotoAppelOffre() {
    }

    @PrePersist
    public void avantEnregistrement() {
        if (dateAjout == null) {
            dateAjout = LocalDateTime.now();
        }
    }

    public Long getIdPhoto() { return idPhoto; }
    public void setIdPhoto(Long idPhoto) { this.idPhoto = idPhoto; }

    public AppelOffre getAppelOffre() { return appelOffre; }
    public void setAppelOffre(AppelOffre appelOffre) { this.appelOffre = appelOffre; }

    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String nomFichier) { this.nomFichier = nomFichier; }

    public String getChemin() { return chemin; }
    public void setChemin(String chemin) { this.chemin = chemin; }

    public String getTypeContenu() { return typeContenu; }
    public void setTypeContenu(String typeContenu) { this.typeContenu = typeContenu; }

    public Long getTaille() { return taille; }
    public void setTaille(Long taille) { this.taille = taille; }

    public LocalDateTime getDateAjout() { return dateAjout; }
    public void setDateAjout(LocalDateTime dateAjout) { this.dateAjout = dateAjout; }
}
