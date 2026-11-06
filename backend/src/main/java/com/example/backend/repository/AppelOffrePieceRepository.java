package com.example.backend.repository;

import com.example.backend.entity.AppelOffrePiece;
import com.example.backend.entity.AppelOffrePieceId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppelOffrePieceRepository extends JpaRepository<AppelOffrePiece, AppelOffrePieceId> {
}
