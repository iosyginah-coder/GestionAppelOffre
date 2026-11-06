package com.example.backend.controller;

import com.example.backend.entity.AppelOffreCritere;
import com.example.backend.repository.AppelOffreCritereRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appel-offre-criteres")
public class AppelOffreCritereController extends CrudController<AppelOffreCritere> {
    private final AppelOffreCritereRepository repo;
    public AppelOffreCritereController(AppelOffreCritereRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<AppelOffreCritere, Long> repository() { return repo; }
}
