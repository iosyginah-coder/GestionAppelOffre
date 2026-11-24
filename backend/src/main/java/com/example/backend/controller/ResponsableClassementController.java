package com.example.backend.controller;

import com.example.backend.service.ClassementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classements/responsable")
@PreAuthorize("hasRole('RESPONSABLE_MARCHES')")
public class ResponsableClassementController {

    private final ClassementService classementService;

    public ResponsableClassementController(ClassementService classementService) {
        this.classementService = classementService;
    }

    // Soumissionnaires transmis par les évaluateurs, groupés par appel d'offres
    @GetMapping
    public List<Map<String, Object>> recus() {
        return classementService.recus();
    }

    // Publier les soumissionnaires retenus d'UN appel d'offres
    @PostMapping("/appel/{idAppelOffre}/publier")
    public ResponseEntity<?> publier(@PathVariable Long idAppelOffre) {
        int nb = classementService.publier(idAppelOffre);
        return ResponseEntity.ok(Map.of("message", nb + " soumissionnaire(s) publié(s).", "publies", nb));
    }
}
