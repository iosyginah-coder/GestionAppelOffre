
package com.example.backend.repository;

import com.example.backend.entity.AppelOffrePiece;
import com.example.backend.entity.AppelOffrePieceId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppelOffrePieceRepository
        extends JpaRepository<AppelOffrePiece, AppelOffrePieceId> {
}
