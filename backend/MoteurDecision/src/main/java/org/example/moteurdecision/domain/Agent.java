package org.example.moteurdecision.domain;

import org.example.moteurdecision.domain.status.StatutAgent;

import java.util.Objects;
import java.util.Optional;

public class Agent{

    private final Utilisateur utilisateur;
    private Caserne caserne;
    private RoleAgent role;
    private StatutAgent statut;
    private Vehicule vehicule;

    public Agent(Utilisateur utilisateur, Caserne caserne, StatutAgent statut) {
        this.utilisateur = Objects.requireNonNull(utilisateur, "utilisateur doit non null");
        if (utilisateur.getDetailsAgent().isPresent()) {
            throw new IllegalStateException("L'utilisateur possède déjà un agent associé.");
        }
        this.statut = Objects.requireNonNull(statut, "Le statut doit être non null");
        affecterCaserne(Objects.requireNonNull(caserne, "caserne"));
        utilisateur.lierAgent(this);
    }

    public Integer getId() {
        return utilisateur.getId();
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public Caserne getCaserne() {
        return caserne;
    }

    public Optional<RoleAgent> getRole() {
        return Optional.ofNullable(role);
    }

    public StatutAgent getStatut() {
        return statut;
    }

    public Optional<Vehicule> getVehicule() {
        return Optional.ofNullable(vehicule);
    }

    public void changerRole(RoleAgent role) {
        this.role = role;
    }

    public void mettreAJourStatut(StatutAgent nouveauStatut) {
        this.statut = Objects.requireNonNull(nouveauStatut, "statut");
    }

    public void affecterCaserne(Caserne nouvelleCaserne) {
        if (this.caserne == nouvelleCaserne) {
            return;
        }
        Caserne ancienne = this.caserne;
        this.caserne = nouvelleCaserne;
        if (ancienne != null) {
            ancienne.detacherAgent(this);
        }
        if (nouvelleCaserne != null) {
            nouvelleCaserne.rattacherAgent(this);
        }
    }

    public void affecterVehicule(Vehicule nouveauVehicule) {
        if (this.vehicule == nouveauVehicule) {
            return;
        }
        Vehicule ancien = this.vehicule;
        this.vehicule = nouveauVehicule;
        if (ancien != null) {
            ancien.detacherAgent(this);
        }
        if (nouveauVehicule != null) {
            nouveauVehicule.rattacherAgent(this);
        }
    }
}
