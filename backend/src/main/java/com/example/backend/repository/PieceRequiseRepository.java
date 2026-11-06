package com.example.backend.repository;

import com.example.backend.entity.PieceRequise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PieceRequiseRepository extends JpaRepository<PieceRequise, Long> {
}
