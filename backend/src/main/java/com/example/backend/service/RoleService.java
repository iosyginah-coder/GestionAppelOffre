
package com.example.backend.service;

import com.example.backend.entity.Role;
import com.example.backend.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<Role> obtenirTousLesRoles() {
        return roleRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Role obtenirRoleParId(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Rôle introuvable : " + id));
    }

    public Role creerRole(Role role) {
        if (role.getNomRole() == null ||
                role.getNomRole().isBlank()) {
            throw new IllegalArgumentException(
                    "Le nom du rôle est obligatoire.");
        }

        if (roleRepository.existsByNomRole(role.getNomRole())) {
            throw new IllegalArgumentException(
                    "Ce rôle existe déjà.");
        }

        if (role.getActif() == null) {
            role.setActif(true);
        }

        return roleRepository.save(role);
    }

    public Role modifierRole(Long id, Role donnees) {
        Role role = obtenirRoleParId(id);

        if (donnees.getNomRole() == null ||
                donnees.getNomRole().isBlank()) {
            throw new IllegalArgumentException(
                    "Le nom du rôle est obligatoire.");
        }

        roleRepository.findByNomRole(donnees.getNomRole())
                .filter(existant ->
                        !existant.getIdRole().equals(id))
                .ifPresent(existant -> {
                    throw new IllegalArgumentException(
                            "Ce nom de rôle existe déjà.");
                });

        role.setNomRole(donnees.getNomRole());
        role.setDescription(donnees.getDescription());

        if (donnees.getActif() != null) {
            role.setActif(donnees.getActif());
        }

        return roleRepository.save(role);
    }

    public void supprimerRole(Long id) {
        Role role = obtenirRoleParId(id);
        roleRepository.delete(role);
    }
}
