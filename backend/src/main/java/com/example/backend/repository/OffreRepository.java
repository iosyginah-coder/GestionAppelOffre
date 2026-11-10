
package com.example.backend.repository;

import com.example.backend.entity.Offre;
import com.example.backend.entity.AppelOffre;
import com.example.backend.entity.Utilisateur;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OffreRepository extends JpaRepository<Offre, Long> {

    // Offres déposées par un soumissionnaire
    List<Offre> findByUtilisateurOrderByIdOffreDesc(
            Utilisateur utilisateur
    );

    // Offres déposées pour un appel d'offres
    List<Offre> findByAppelOffre(AppelOffre appelOffre);

    // Vérifier si le soumissionnaire a déjà déposé une offre
    boolean existsByAppelOffreAndUtilisateur(
            AppelOffre appelOffre,
            Utilisateur utilisateur
    );

    // Recherche par accusé de réception
    Optional<Offre> findByAccuseDeReception(
            String accuseDeReception
    );

    // Recherche des offres par identifiant d'appel d'offres
    List<Offre> findByAppelOffre_IdAppelOffreOrderByIdOffreDesc(
            Long idAppelOffre
    );

    // Rechercher les offres par statut
    List<Offre> findByStatutIn(List<String> statuts);

    // Rechercher les offres d'un appel d'offres et d'un statut
    List<Offre> findByAppelOffre_IdAppelOffreAndStatut(
            Long idAppelOffre,
            String statut
    );
}
