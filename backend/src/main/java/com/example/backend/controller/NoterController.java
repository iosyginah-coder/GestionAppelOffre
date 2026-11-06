package com.example.backend.controller;

import com.example.backend.entity.Noter;
import com.example.backend.repository.NoterRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notes")
public class NoterController extends CrudController<Noter> {
    private final NoterRepository repo;
    public NoterController(NoterRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<Noter, Long> repository() { return repo; }
}
