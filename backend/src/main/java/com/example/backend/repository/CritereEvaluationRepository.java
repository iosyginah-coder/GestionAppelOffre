package com.example.backend.repository;

import com.example.backend.entity.CritereEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CritereEvaluationRepository extends JpaRepository<CritereEvaluation, Long> {
}
