package com.example.backend.repository;

import com.example.backend.entity.Marche;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MarcheRepository extends JpaRepository<Marche, Long> {

    List<Marche> findByOffre_IdOffre(Long idOffre);
}