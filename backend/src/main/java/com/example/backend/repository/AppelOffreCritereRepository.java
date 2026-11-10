
package com.example.backend.repository;

import com.example.backend.entity.AppelOffreCritere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppelOffreCritereRepository
        extends JpaRepository<AppelOffreCritere, Long> {

    // Récupérer tous les critères associés à un appel d'offres
    List<AppelOffreCritere>
    findByAppelOffre_IdAppelOffre(Long idAppelOffre);
}
