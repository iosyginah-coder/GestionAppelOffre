package com.example.backend.repository;

import com.example.backend.entity.PhotoAppelOffre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoAppelOffreRepository
        extends JpaRepository<PhotoAppelOffre, Long> {

    List<PhotoAppelOffre> findByAppelOffre_IdAppelOffreOrderByIdPhotoAsc(
            Long idAppelOffre
    );

    long countByAppelOffre_IdAppelOffre(Long idAppelOffre);

    Optional<PhotoAppelOffre> findByIdPhotoAndAppelOffre_IdAppelOffre(
            Long idPhoto,
            Long idAppelOffre
    );
}
