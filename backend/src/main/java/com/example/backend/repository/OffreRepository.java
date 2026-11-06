package com.example.backend.repository;

import com.example.backend.entity.Offre;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OffreRepository extends JpaRepository<Offre, Long> {
}
