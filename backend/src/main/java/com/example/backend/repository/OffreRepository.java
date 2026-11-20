package com.example.backend.repository;

import com.example.backend.entity.Offre;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Collection;

public interface OffreRepository extends JpaRepository<Offre, Long> {

    List<Offre> findAllByOrderByDateDepotDesc();

    List<Offre> findByStatutInOrderByDateDepotDesc(Collection<String> statuts);

    List<Offre> findByAppelOffre_IdAppelOffreOrderByDateDepotDesc(
            Long idAppelOffre);
}