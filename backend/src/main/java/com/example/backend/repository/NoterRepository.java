
package com.example.backend.repository;

import com.example.backend.entity.Noter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoterRepository
        extends JpaRepository<Noter, Long> {

    // Toutes les notes d'une offre
    List<Noter> findByOffre_IdOffreOrderByIdNoterAsc(
            Long offreId
    );

    // Vérifier si un évaluateur a déjà noté un critère pour une offre
    Optional<Noter>
    findByOffre_IdOffreAndCritere_IdCritereAndUtilisateur_IdUtilisateur(
            Long offreId,
            Long critereId,
            Long utilisateurId
    );

    // Récupérer toutes les notes d'un évaluateur pour une offre
    List<Noter>
    findByOffre_IdOffreAndUtilisateur_IdUtilisateur(
            Long offreId,
            Long utilisateurId
    );
}
