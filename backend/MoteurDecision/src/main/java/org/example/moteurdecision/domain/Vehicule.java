package org.example.moteurdecision.domain;

import org.example.moteurdecision.domain.interfaces.IGeolocated;
import org.example.moteurdecision.domain.status.StatutVehicule;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public class Vehicule implements IGeolocated {

    private final UUID idVehicule;
    private Caserne caserne;
    private StatutVehicule statut;
    private final Set<Equipement> equipements = new HashSet<>();
    private final Set<Agent> agents = new HashSet<>();
    private Intervention interventionCourante;
    private double latitude;
    private double longitude;

    public Vehicule(UUID idVehicule, double latitude, double longitude, StatutVehicule statut) {
        this.idVehicule = idVehicule;
        this.latitude = Objects.requireNonNull(latitude, "latitude doit être non null");
        this.longitude = Objects.requireNonNull(longitude, "longitude doit être non null");
        this.statut = Objects.requireNonNull(statut, "statut");
    }

    public UUID getId() {
        return idVehicule;
    }

    public Optional<Caserne> getCaserne() {
        return Optional.ofNullable(caserne);
    }

    public StatutVehicule getStatut() {
        return statut;
    }

    public Set<Equipement> getEquipements() {
        return Collections.unmodifiableSet(equipements);
    }

    public Set<Agent> getAgents() {
        return Collections.unmodifiableSet(agents);
    }

    public Optional<Intervention> getInterventionCourante() {
        return Optional.ofNullable(interventionCourante);
    }

    public void mettreAJourStatut(StatutVehicule nouveauStatut) {
        this.statut = Objects.requireNonNull(nouveauStatut, "statut");
    }

    public void affecterCaserne(Caserne nouvelleCaserne) {
        if (this.caserne == nouvelleCaserne) {
            return;
        }
        Caserne ancienneCaserne = this.caserne;
        this.caserne = nouvelleCaserne;

        if (ancienneCaserne != null) {
            ancienneCaserne.detacherVehicule(this);
        }
        if (nouvelleCaserne != null) {
            nouvelleCaserne.rattacherVehicule(this);
        }
    }

    public void ajouterEquipement(Equipement equipement) {
        Objects.requireNonNull(equipement, "equipement");
        if (equipements.add(equipement)) {
            equipement.associerVehicule(this);
        }
    }

    public void retirerEquipement(Equipement equipement) {
        if (equipement != null && equipements.remove(equipement)) {
            equipement.retirerVehicule(this);
        }
    }

    void rattacherAgent(Agent agent) {
        if (agent != null) {
            agents.add(agent);
        }
    }

    void detacherAgent(Agent agent) {
        agents.remove(agent);
    }

    void rattacherIntervention(Intervention intervention) {
        this.interventionCourante = intervention;
    }

    void detacherIntervention(Intervention intervention) {
        if (this.interventionCourante == intervention) {
            this.interventionCourante = null;
        }
    }

    @Override
    public double getLatitude() {
        return this.latitude;
    }

    @Override
    public double getLongitude() {
        return this.longitude;
    }

    public void setPosition(double latitude, double longitude){
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
