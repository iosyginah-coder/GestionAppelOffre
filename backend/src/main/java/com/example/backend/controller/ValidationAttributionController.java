package com.example.backend.controller;

import com.example.backend.entity.ValidationAttribution;
import com.example.backend.repository.ValidationAttributionRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/validations-attribution")
public class ValidationAttributionController extends CrudController<ValidationAttribution> {
    private final ValidationAttributionRepository repo;
    public ValidationAttributionController(ValidationAttributionRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<ValidationAttribution, Long> repository() { return repo; }
}
