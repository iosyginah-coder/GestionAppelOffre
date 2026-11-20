
package com.example.backend.repository;

import com.example.backend.entity.PieceDepot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PieceDepotRepository extends JpaRepository<PieceDepot, Long> {

    List<PieceDepot> findByOffre_IdOffreOrderByIdPieceDepotAsc(Long idOffre);

    List<PieceDepot> findByOffre_AppelOffre_IdAppelOffreOrderByIdPieceDepotAsc(Long idAppelOffre);
}
