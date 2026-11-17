
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

    // Offres liées à un utilisateur, pour les anciennes fonctionnalités
    List<Offre> findByUtilisateurOrderByIdOffreDesc(
            Utilisateur utilisateur
    );

    // Offres d'un appel d'offres
    List<Offre> findByAppelOffre(AppelOffre appelOffre);

    // Vérification des doublons pour les anciens comptes
    boolean existsByAppelOffreAndUtilisateur(
            AppelOffre appelOffre,
            Utilisateur utilisateur
    );

    // Recherche par accusé de réception
    Optional<Offre> findByAccuseDeReception(String accuseDeReception);

    // Offres par identifiant d'appel d'offres
    List<Offre> findByAppelOffre_IdAppelOffreOrderByIdOffreDesc(
            Long idAppelOffre
    );

    // Recherche par statut
    List<Offre> findByStatutIn(List<String> statuts);

    // Recherche par appel d'offres et statut
    List<Offre> findByAppelOffre_IdAppelOffreAndStatut(
            Long idAppelOffre,
            String statut
    );
}
