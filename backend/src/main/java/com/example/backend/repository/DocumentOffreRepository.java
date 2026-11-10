
package com.example.backend.repository;

import com.example.backend.entity.DocumentOffre;
import com.example.backend.entity.Offre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentOffreRepository
        extends JpaRepository<DocumentOffre, Long> {

    // Rechercher les documents d'une offre
    List<DocumentOffre> findByOffre(Offre offre);

    // Rechercher les documents par identifiant d'offre
    List<DocumentOffre> findByOffre_IdOffreOrderByIdDocumentAsc(
            Long offreId
    );
}
