package com.example.backend.controller;

import com.example.backend.entity.Offre;
import com.example.backend.repository.OffreRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offres")
public class OffreController extends CrudController<Offre> {
    private final OffreRepository repo;
    public OffreController(OffreRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<Offre, Long> repository() { return repo; }
}
