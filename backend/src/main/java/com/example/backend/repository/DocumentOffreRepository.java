package com.example.backend.repository;

import com.example.backend.entity.DocumentOffre;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DocumentOffreRepository extends JpaRepository<DocumentOffre, Long> {
}
