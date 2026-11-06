package com.example.backend.dto;

import com.example.backend.entity.Utilisateur;

public final class UtilisateurDTO {

    private UtilisateurDTO() {
    }

    public record CreationRequest(
            String matricule,
            String nomComplet,
            String email,
            String role,
            String departement,
            String motDePasseInitial
    ) {
    }

    public record ModificationRequest(
            String nomComplet,
            String email,
            String role,
            String departement
    ) {
    }

    public record StatutRequest(
            String statut
    ) {
    }

    public record Reponse(
            Long idUtilisateur,
            String matricule,
            String nomComplet,
            String email,
            String role,
            String departement,
            String statut
    ) {
        public static Reponse depuis(Utilisateur utilisateur) {
            return new Reponse(
                    utilisateur.getIdUtilisateur(),
                    utilisateur.getMatricule(),
                    utilisateur.getNomComplet(),
                    utilisateur.getEmail(),
                    utilisateur.getRole(),
                    utilisateur.getDepartement(),
                    utilisateur.getStatut()
            );
        }
    }
}
