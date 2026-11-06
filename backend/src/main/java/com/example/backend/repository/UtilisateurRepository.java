package com.example.backend.repository;

import com.example.backend.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UtilisateurRepository
        extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByMatricule(String matricule);

    boolean existsByMatricule(String matricule);

    boolean existsByEmail(String email);
}
