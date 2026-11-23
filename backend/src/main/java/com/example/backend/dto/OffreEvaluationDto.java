package com.example.backend.dto;

import java.time.LocalDateTime;

public record OffreEvaluationDto(
        Long idOffre,
        String accuseDeReception,
        String statut,
        LocalDateTime dateDepot,
        String typeSoumissionnaire,
        String nomAffiche,
        String nomSoumissionnaire,
        String entreprise,
        String nif,
        String stat,
        String adresse,
        String email,
        String telephone,
        AppelDto appelOffre
) {

    public record AppelDto(
            Long idAppelOffre,
            String reference,
            String objet,
            String description,
            String lieuExecution,
            LocalDateTime dateLimiteDepot
    ) {}

    // Un document du dossier (piece requise, CIN, offre technique, offre financiere)
    public record DocumentDto(
            String cle,
            String categorie,
            String libelle,
            String nomFichier,
            String typeContenu
    ) {}
}
