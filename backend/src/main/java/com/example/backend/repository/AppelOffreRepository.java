
package com.example.backend.repository;

import com.example.backend.entity.AppelOffre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppelOffreRepository
        extends JpaRepository<AppelOffre, Long> {

    List<AppelOffre> findAllByOrderByIdAppelOffreDesc();

    List<AppelOffre> findByStatutIgnoreCaseOrderByIdAppelOffreDesc(
            String statut
    );

    List<AppelOffre> findByTypeMarcheIgnoreCaseOrderByIdAppelOffreDesc(
            String typeMarche
    );

    List<AppelOffre> findByObjetContainingIgnoreCaseOrderByIdAppelOffreDesc(
            String objet
    );

    List<AppelOffre> findByStatutIgnoreCaseAndTypeMarcheIgnoreCaseOrderByIdAppelOffreDesc(
            String statut,
            String typeMarche
    );

    List<AppelOffre> findByStatutIgnoreCaseAndObjetContainingIgnoreCaseOrderByIdAppelOffreDesc(
            String statut,
            String objet
    );

    long countByStatutIgnoreCase(String statut);

    long countByStatutIgnoreCaseAndDateLimiteDepotBefore(
            String statut,
            java.time.LocalDateTime date
    );
}
