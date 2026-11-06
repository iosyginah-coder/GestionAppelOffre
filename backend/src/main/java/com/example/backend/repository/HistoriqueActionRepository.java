package com.example.backend.repository;

import com.example.backend.entity.HistoriqueAction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HistoriqueActionRepository extends JpaRepository<HistoriqueAction, Long> {
}
