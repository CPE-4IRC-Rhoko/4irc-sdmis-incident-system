package org.example.moteurdecision.domain;

import java.util.Objects;

public class RoleAgent {

    private final int idRole;
    private String nomRole;

    public RoleAgent(int idRole, String nomRole) {
        this.idRole = idRole;
        this.nomRole = Objects.requireNonNull(nomRole, "nomRole");
    }

    public int getId() {
        return idRole;
    }

    public String getNom() {
        return nomRole;
    }

    public void setNomRole(String nomRole) {
        this.nomRole = Objects.requireNonNull(nomRole, "nomRole");
    }
}
