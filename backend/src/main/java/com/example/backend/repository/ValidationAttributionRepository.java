package com.example.backend.repository;

import com.example.backend.entity.ValidationAttribution;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ValidationAttributionRepository extends JpaRepository<ValidationAttribution, Long> {
}
