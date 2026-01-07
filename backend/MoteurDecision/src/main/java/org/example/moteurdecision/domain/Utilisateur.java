package org.example.moteurdecision.domain;

import java.util.Objects;
import java.util.Optional;

public class Utilisateur {

    private final int idUtilisateur;
    private String nom;
    private String prenom;
    private PermissionUtilisateur permission;
    private Agent detailsAgent;

    public Utilisateur(int idUtilisateur, String nom, String prenom, PermissionUtilisateur permission) {
        this.idUtilisateur = idUtilisateur;
        this.nom = Objects.requireNonNull(nom, "nom");
        this.prenom = Objects.requireNonNull(prenom, "prenom");
        setPermission(permission);
    }

    public Integer getId() {
        return idUtilisateur;
    }

    public String getNom() {
        return nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public PermissionUtilisateur getPermission() {
        return permission;
    }

    public Optional<Agent> getDetailsAgent() {
        return Optional.ofNullable(detailsAgent);
    }

    public void setNom(String nom) {
        this.nom = Objects.requireNonNull(nom, "nom");
    }

    public void setPrenom(String prenom) {
        this.prenom = Objects.requireNonNull(prenom, "prenom");
    }

    public final void setPermission(PermissionUtilisateur nouvellePermission) {
        Objects.requireNonNull(nouvellePermission, "permission");
        if (this.permission != null && this.permission != nouvellePermission) {
            this.permission.retirerUtilisateur(this);
        }
        this.permission = nouvellePermission;
        this.permission.enregistrerUtilisateur(this);
    }

    void lierAgent(Agent agent) {
        this.detailsAgent = agent;
    }

    void delierAgent() {
        this.detailsAgent = null;
    }
}
