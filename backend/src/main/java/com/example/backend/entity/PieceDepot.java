
package com.example.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "piece_depot")
public class PieceDepot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_piece_depot")
    private Long idPieceDepot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_offre", nullable = false)
    private Offre offre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_piece", nullable = false)
    private PieceRequise pieceRequise;

    @Column(name = "nom_fichier", nullable = false, length = 255)
    private String nomFichier;

    @Column(name = "chemin_fichier", nullable = false, length = 500)
    private String cheminFichier;

    @Column(name = "type_contenu", length = 150)
    private String typeContenu;

    @Column(name = "date_ajout", nullable = false)
    private LocalDateTime dateAjout;

    public Long getIdPieceDepot() { return idPieceDepot; }
    public void setIdPieceDepot(Long idPieceDepot) { this.idPieceDepot = idPieceDepot; }

    public Offre getOffre() { return offre; }
    public void setOffre(Offre offre) { this.offre = offre; }

    public PieceRequise getPieceRequise() { return pieceRequise; }
    public void setPieceRequise(PieceRequise pieceRequise) { this.pieceRequise = pieceRequise; }

    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String nomFichier) { this.nomFichier = nomFichier; }

    public String getCheminFichier() { return cheminFichier; }
    public void setCheminFichier(String cheminFichier) { this.cheminFichier = cheminFichier; }

    public String getTypeContenu() { return typeContenu; }
    public void setTypeContenu(String typeContenu) { this.typeContenu = typeContenu; }

    public LocalDateTime getDateAjout() { return dateAjout; }
    public void setDateAjout(LocalDateTime dateAjout) { this.dateAjout = dateAjout; }
}
