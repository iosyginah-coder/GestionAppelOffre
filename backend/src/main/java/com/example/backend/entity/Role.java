
package com.example.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idrole")
    private Long idRole;

    @Column(name = "nomrole", nullable = false, unique = true, length = 50)
    private String nomRole;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "actif", nullable = false)
    private Boolean actif = true;

    public Role() {
    }

    public Role(String nomRole, String description, Boolean actif) {
        this.nomRole = nomRole;
        this.description = description;
        this.actif = actif;
    }

    public Long getIdRole() {
        return idRole;
    }

    public void setIdRole(Long idRole) {
        this.idRole = idRole;
    }

    public String getNomRole() {
        return nomRole;
    }

    public void setNomRole(String nomRole) {
        this.nomRole = nomRole;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getActif() {
        return actif;
    }

    public void setActif(Boolean actif) {
        this.actif = actif;
    }
}
