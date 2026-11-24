package com.example.backend.repository;

import com.example.backend.entity.ValidationAttribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ValidationAttributionRepository extends JpaRepository<ValidationAttribution, Long> {
    // Suppression des validations d'une offre
    void deleteByOffre_IdOffre(Long idOffre);
    boolean existsByOffre_IdOffreInAndNiveau(Collection<Long> idsOffre, Integer niveau);

    List<ValidationAttribution> findByNiveau(Integer niveau);

    List<ValidationAttribution> findByNiveauOrderByOffre_AppelOffre_IdAppelOffreAscIdValidationAsc(Integer niveau);

    List<ValidationAttribution> findByNiveauAndOffre_AppelOffre_IdAppelOffre(Integer niveau, Long idAppelOffre);

    // Appels d'offres dont les offres retenues ont déjà été transmises (niveau 1)
    @Query("select distinct v.offre.appelOffre.idAppelOffre from ValidationAttribution v where v.niveau = 1")
    List<Long> findAppelsTransmis();
}
