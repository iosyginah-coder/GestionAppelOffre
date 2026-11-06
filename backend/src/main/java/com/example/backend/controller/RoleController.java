
package com.example.backend.controller;

import com.example.backend.entity.Role;
import com.example.backend.service.RoleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<List<Role>> obtenirTousLesRoles() {
        return ResponseEntity.ok(
                roleService.obtenirTousLesRoles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Role> obtenirRoleParId(
            @PathVariable Long id) {
        return ResponseEntity.ok(
                roleService.obtenirRoleParId(id));
    }

    @PostMapping
    public ResponseEntity<Role> creerRole(
            @RequestBody Role role) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(roleService.creerRole(role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Role> modifierRole(
            @PathVariable Long id,
            @RequestBody Role role) {
        return ResponseEntity.ok(
                roleService.modifierRole(id, role));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimerRole(
            @PathVariable Long id) {
        roleService.supprimerRole(id);
        return ResponseEntity.noContent().build();
    }
}
