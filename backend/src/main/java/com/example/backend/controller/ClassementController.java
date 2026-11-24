package com.example.backend.controller;

import com.example.backend.service.ClassementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classements")
@PreAuthorize("hasRole('EVALUATEUR')")
public class ClassementController {

    private final ClassementService classementService;

    public ClassementController(ClassementService classementService) {
        this.classementService = classementService;
    }

    // Transmettre au Responsable des marchés les offres sélectionnées d'UN appel d'offres
    @PostMapping("/transmettre")
    public ResponseEntity<?> transmettre(@RequestBody ClassementService.TransmissionRequest request) {
        int nb = classementService.transmettre(request);
        return ResponseEntity.ok(Map.of("message", nb + " offre(s) transmise(s).", "transmises", nb));
    }

    // Appels d'offres dont le classement a déjà été transmis
    @GetMapping("/transmis")
    public List<Long> appelsTransmis() {
        return classementService.appelsTransmis();
    }
}
