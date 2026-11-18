package com.example.backend.repository;

import com.example.backend.entity.PieceRequise;
import com.example.backend.entity.AppelOffre;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PieceRequiseRepository
        extends JpaRepository<PieceRequise, Long> {

    // Toutes les pièces d'un appel d'offres
    List<PieceRequise> findByAppelOffreOrderByIdPieceAsc(
            AppelOffre appelOffre
    );

    // Pièces d'un appel d'offres par son identifiant
    List<PieceRequise> findByAppelOffre_IdAppelOffreOrderByIdPieceAsc(
            Long idAppelOffre
    );

    // Nombre de pièces requises d'un appel d'offres
    long countByAppelOffre_IdAppelOffre(Long idAppelOffre);

    // Supprimer les pièces associées à un appel d'offres
    void deleteByAppelOffre_IdAppelOffre(Long idAppelOffre);
}