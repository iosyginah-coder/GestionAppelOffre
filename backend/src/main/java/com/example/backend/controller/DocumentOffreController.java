package com.example.backend.controller;

import com.example.backend.entity.DocumentOffre;
import com.example.backend.repository.DocumentOffreRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/documents-offre")
public class DocumentOffreController extends CrudController<DocumentOffre> {
    private final DocumentOffreRepository repo;
    public DocumentOffreController(DocumentOffreRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<DocumentOffre, Long> repository() { return repo; }
}
