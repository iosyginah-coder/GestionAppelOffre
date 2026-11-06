package com.example.backend.controller;

import com.example.backend.entity.HistoriqueAction;
import com.example.backend.repository.HistoriqueActionRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/historique-actions")
public class HistoriqueActionController extends CrudController<HistoriqueAction> {

    private final HistoriqueActionRepository repo;

    public HistoriqueActionController(HistoriqueActionRepository repo) {
        this.repo = repo;
    }

    @Override
    protected JpaRepository<HistoriqueAction, Long> repository() {
        return repo;
    }
}