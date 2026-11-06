package com.example.backend.repository;

import com.example.backend.entity.Noter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface NoterRepository extends JpaRepository<Noter, Long> {
}
