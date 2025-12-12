package org.example.moteurdecision.domain;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class PermissionUtilisateur {

    private final int idPermission;
    private String nomPermission;
    private final Set<Utilisateur> utilisateurs = new HashSet<>();

    public PermissionUtilisateur(int idPermission, String nomPermission) {
        this.idPermission = idPermission;
        this.nomPermission = Objects.requireNonNull(nomPermission, "nomPermission");
    }

    public Integer getId() {
        return idPermission;
    }

    public String getNom() {
        return nomPermission;
    }

    public void setNomPermission(String nomPermission) {
        this.nomPermission = Objects.requireNonNull(nomPermission, "nomPermission");
    }

    public Set<Utilisateur> getUtilisateurs() {
        return Collections.unmodifiableSet(utilisateurs);
    }

    void enregistrerUtilisateur(Utilisateur utilisateur) {
        if (utilisateur != null) {
            utilisateurs.add(utilisateur);
        }
    }

    void retirerUtilisateur(Utilisateur utilisateur) {
        utilisateurs.remove(utilisateur);
    }
}
