package com.example.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "jalon")
public class Jalon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_jalon")
    private Long idJalon;

    @Column(name = "libelle", nullable = false, length = 150)
    private String libelle;

    @Column(name = "date_prevue", nullable = false)
    private LocalDate datePrevue;

    @Column(name = "date_reelle")
    private LocalDate dateReelle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_marche", nullable = true)
    private Marche marche;

    public Long getIdJalon() { return idJalon; }
    public void setIdJalon(Long value) { this.idJalon = value; }

    public String getLibelle() { return libelle; }
    public void setLibelle(String value) { this.libelle = value; }

    public LocalDate getDatePrevue() { return datePrevue; }
    public void setDatePrevue(LocalDate value) { this.datePrevue = value; }

    public LocalDate getDateReelle() { return dateReelle; }
    public void setDateReelle(LocalDate value) { this.dateReelle = value; }

    public Marche getMarche() { return marche; }
    public void setMarche(Marche value) { this.marche = value; }

}
