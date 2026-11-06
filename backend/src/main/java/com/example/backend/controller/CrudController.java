package com.example.backend.controller;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

public abstract class CrudController<T> {
    protected abstract JpaRepository<T, Long> repository();

    @GetMapping
    public List<T> list() {
        return repository().findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<T> get(@PathVariable Long id) {
        return repository().findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<T> create(@RequestBody T body) {
        T saved = repository().save(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<T> update(@PathVariable Long id, @RequestBody T body) {
        if (!repository().existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // Le corps doit contenir l'identifiant correspondant à la ressource.
        return ResponseEntity.ok(repository().save(body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository().existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository().deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
