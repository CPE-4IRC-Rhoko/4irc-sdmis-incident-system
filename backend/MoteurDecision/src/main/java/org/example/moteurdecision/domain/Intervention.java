package org.example.moteurdecision.domain;

import org.example.moteurdecision.domain.status.StatutIntervention;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

public class Intervention {

    private final int idEvenement;
    private Evenement evenement;
    private Vehicule vehicule;
    private Instant dateDebut;
    private Instant dateFin;
    private StatutIntervention statut;

    public Intervention(Evenement evenement, Vehicule vehicule, StatutIntervention statut) {
        Objects.requireNonNull(evenement, "evenement");
        Objects.requireNonNull(vehicule, "vehicule");
        this.idEvenement = evenement.getId();
        this.statut = Objects.requireNonNull(statut, "statut");
        evenement.lierIntervention(this);
        associerVehicule(vehicule);
    }

    public Integer getId() {
        return idEvenement;
    }

    public Evenement getEvenement() {
        return evenement;
    }

    public Vehicule getVehicule() {
        return vehicule;
    }

    public Instant getDateDebut() {
        return dateDebut;
    }

    public Optional<Instant> getDateFin() {
        return Optional.ofNullable(dateFin);
    }

    public StatutIntervention getStatut() {
        return statut;
    }

    public void replanifier(Instant nouvelleDateDebut) {
        this.dateDebut = Objects.requireNonNull(nouvelleDateDebut, "dateDebut");
        this.dateFin = null;
    }

    public void terminer(Instant dateFin) {
        this.dateFin = Objects.requireNonNull(dateFin, "dateFin");
    }

    public void changerStatut(StatutIntervention nouveauStatut) {
        this.statut = Objects.requireNonNull(nouveauStatut, "statut");
    }

    public void reaffecterVehicule(Vehicule nouveauVehicule) {
        Objects.requireNonNull(nouveauVehicule, "vehicule");
        associerVehicule(nouveauVehicule);
    }

    void rattacherEvenement(Evenement evenement) {
        this.evenement = evenement;
    }

    void detacherEvenement() {
        this.evenement = null;
    }

    private void associerVehicule(Vehicule nouveauVehicule) {
        if (this.vehicule == nouveauVehicule) {
            return;
        }
        Vehicule ancien = this.vehicule;
        this.vehicule = nouveauVehicule;
        if (ancien != null) {
            ancien.detacherIntervention(this);
        }
        if (nouveauVehicule != null) {
            nouveauVehicule.rattacherIntervention(this);
        }
    }
}
