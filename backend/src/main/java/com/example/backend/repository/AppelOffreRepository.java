
package com.example.backend.repository;

import com.example.backend.entity.AppelOffre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppelOffreRepository
        extends JpaRepository<AppelOffre, Long> {

    // Liste complète, du plus récent au plus ancien
    List<AppelOffre> findAllByOrderByIdAppelOffreDesc();

    // Recherche par statut
    List<AppelOffre> findByStatutIgnoreCaseOrderByIdAppelOffreDesc(
            String statut
    );

    // Liste des appels par date de publication
    List<AppelOffre> findByStatutIgnoreCaseOrderByDatePublicationDesc(
            String statut
    );

    // Recherche par objet
    List<AppelOffre> findByObjetContainingIgnoreCaseOrderByIdAppelOffreDesc(
            String objet
    );

    // Vérifier si une référence existe déjà
    boolean existsByReferenceIgnoreCase(String reference);

    // Vérifier si une référence existe déjà pour un autre appel
    boolean existsByReferenceIgnoreCaseAndIdAppelOffreNot(
            String reference,
            Long idAppelOffre
    );

    // Compter les appels par statut
    long countByStatutIgnoreCase(String statut);

    // Compter les appels publiés dont la date limite est dépassée
    long countByStatutIgnoreCaseAndDateLimiteDepotBefore(
            String statut,
            LocalDateTime date
    );
}
