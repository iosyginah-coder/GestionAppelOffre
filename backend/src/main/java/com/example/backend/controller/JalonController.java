package com.example.backend.controller;

import com.example.backend.entity.Jalon;
import com.example.backend.repository.JalonRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/jalons")
public class JalonController extends CrudController<Jalon> {
    private final JalonRepository repo;
    public JalonController(JalonRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<Jalon, Long> repository() { return repo; }
}
