package org.example.moteurdecision.domain;

import org.example.moteurdecision.domain.interfaces.IGeolocated;
import org.example.moteurdecision.domain.status.StatutEvenement;

import java.util.Objects;
import java.util.Optional;

public class Evenement implements IGeolocated {

    private final int idEvenement;
    private String description;
    private double latitude;
    private double longitude;
    private TypeEvenement type;
    private StatutEvenement statut;
    private Severite severite;
    private Intervention intervention;

    public Evenement(int idEvenement,
                     String description,
                     double latitude,
                     double longitude,
                     TypeEvenement type,
                     StatutEvenement statut,
                     Severite severite) {
        this.idEvenement = idEvenement;
        this.description = Objects.requireNonNull(description, "description");
        this.latitude = latitude;
        this.longitude = longitude;
        this.type = Objects.requireNonNull(type, "type");
        this.statut = Objects.requireNonNull(statut, "statut");
        this.severite = Objects.requireNonNull(severite, "gravite");
    }

    public Integer getId() {
        return idEvenement;
    }

    public String getDescription() {
        return description;
    }

    @Override
    public double getLatitude() {
        return latitude;
    }

    @Override
    public double getLongitude() {
        return longitude;
    }

    public TypeEvenement getType() {
        return type;
    }

    public StatutEvenement getStatut() {
        return statut;
    }

    public Severite getGravite() {
        return severite;
    }

    public Optional<Intervention> getIntervention() {
        return Optional.ofNullable(intervention);
    }

    public void setDescription(String description) {
        this.description = Objects.requireNonNull(description, "description");
    }

    public void mettreAJourPosition(double latitude, double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void changerType(TypeEvenement type) {
        this.type = Objects.requireNonNull(type, "type");
    }

    public void changerStatut(StatutEvenement statut) {
        this.statut = Objects.requireNonNull(statut, "statut");
    }

    public void changerGravite(Severite severite) {
        this.severite = Objects.requireNonNull(severite, "gravite");
    }

    public void lierIntervention(Intervention intervention) {
        if (this.intervention == intervention) {
            return;
        }
        if (this.intervention != null) {
            this.intervention.detacherEvenement();
        }
        this.intervention = intervention;
        if (intervention != null) {
            intervention.rattacherEvenement(this);
        }
    }

    void detacherIntervention() {
        this.intervention = null;
    }
}
