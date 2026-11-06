package com.example.backend.repository;

import com.example.backend.entity.DemandeReinitialisation;
import com.example.backend.entity.StatutDemande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemandeReinitialisationRepository
        extends JpaRepository<DemandeReinitialisation, Long> {

    List<DemandeReinitialisation> findAllByOrderByDateDemandeDesc();

    boolean existsByMatriculeAndStatut(
            String matricule,
            StatutDemande statut
    );
}
