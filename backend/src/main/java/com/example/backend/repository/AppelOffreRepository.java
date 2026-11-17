
package com.example.backend.repository;

import com.example.backend.entity.AppelOffre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppelOffreRepository
        extends JpaRepository<AppelOffre, Long> {

    // Liste complète
    List<AppelOffre> findAllByOrderByIdAppelOffreDesc();

    // Liste par statut
    List<AppelOffre> findByStatutIgnoreCaseOrderByIdAppelOffreDesc(
            String statut
    );

    // Publications triées par date
    List<AppelOffre> findByStatutIgnoreCaseOrderByDatePublicationDesc(
            String statut
    );

    // Liste par type de marché
    List<AppelOffre> findByTypeMarcheIgnoreCaseOrderByIdAppelOffreDesc(
            String typeMarche
    );

    // Recherche par objet
    List<AppelOffre> findByObjetContainingIgnoreCaseOrderByIdAppelOffreDesc(
            String objet
    );

    // Recherche statut + type
    List<AppelOffre> findByStatutIgnoreCaseAndTypeMarcheIgnoreCaseOrderByIdAppelOffreDesc(
            String statut,
            String typeMarche
    );

    // Recherche statut + objet
    List<AppelOffre> findByStatutIgnoreCaseAndObjetContainingIgnoreCaseOrderByIdAppelOffreDesc(
            String statut,
            String objet
    );

    // Compter par statut
    long countByStatutIgnoreCase(String statut);

    // Compter les appels en retard
    long countByStatutIgnoreCaseAndDateLimiteDepotBefore(
            String statut,
            LocalDateTime date
    );
}
