package com.example.backend.repository;

import com.example.backend.entity.Contrat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContratRepository extends JpaRepository<Contrat, Long> {

    boolean existsByOffre_IdOffre(Long idOffre);

    Optional<Contrat> findByOffre_IdOffre(Long idOffre);
}
