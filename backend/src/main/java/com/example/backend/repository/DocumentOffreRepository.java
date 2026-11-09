package com.example.backend.repository;

import com.example.backend.entity.DocumentOffre;
import com.example.backend.entity.Offre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentOffreRepository extends JpaRepository<DocumentOffre, Long> {

    List<DocumentOffre> findByOffre(Offre offre);
}