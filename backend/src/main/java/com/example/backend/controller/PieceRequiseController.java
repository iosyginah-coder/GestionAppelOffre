package com.example.backend.controller;

import com.example.backend.entity.PieceRequise;
import com.example.backend.repository.PieceRequiseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pieces-requises")
public class PieceRequiseController extends CrudController<PieceRequise> {
    private final PieceRequiseRepository repo;
    public PieceRequiseController(PieceRequiseRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<PieceRequise, Long> repository() { return repo; }
}
