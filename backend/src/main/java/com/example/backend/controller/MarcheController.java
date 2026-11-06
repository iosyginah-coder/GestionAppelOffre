package com.example.backend.controller;

import com.example.backend.entity.Marche;
import com.example.backend.repository.MarcheRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/marches")
public class MarcheController extends CrudController<Marche> {
    private final MarcheRepository repo;
    public MarcheController(MarcheRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<Marche, Long> repository() { return repo; }
}
