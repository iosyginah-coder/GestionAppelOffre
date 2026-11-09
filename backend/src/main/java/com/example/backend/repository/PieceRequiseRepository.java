
package com.example.backend.repository;

import com.example.backend.entity.PieceRequise;
import com.example.backend.entity.AppelOffre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PieceRequiseRepository
        extends JpaRepository<PieceRequise, Long> {

    List<PieceRequise> findByAppelOffreOrderByIdPieceAsc(
            AppelOffre appelOffre
    );

    List<PieceRequise> findByAppelOffre_IdAppelOffre(
            Long idAppelOffre
    );

    void deleteByAppelOffre_IdAppelOffre(Long idAppelOffre);
}
