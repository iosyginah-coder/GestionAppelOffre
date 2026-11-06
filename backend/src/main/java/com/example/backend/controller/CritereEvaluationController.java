package com.example.backend.controller;

import com.example.backend.entity.CritereEvaluation;
import com.example.backend.repository.CritereEvaluationRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/criteres-evaluation")
public class CritereEvaluationController extends CrudController<CritereEvaluation> {
    private final CritereEvaluationRepository repo;
    public CritereEvaluationController(CritereEvaluationRepository repo) { this.repo = repo; }
    @Override protected JpaRepository<CritereEvaluation, Long> repository() { return repo; }
}
