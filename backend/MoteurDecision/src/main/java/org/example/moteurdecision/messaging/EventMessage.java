package org.example.moteurdecision.messaging;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Représente le message envoyé par l'API via RabbitMQ.
 */
public class EventMessage {

    private int idEvenement;
    private String description;
    private double latitude;
    private double longitude;
    private final List<Integer> vehiculesDisponibles = new ArrayList<>();

    public int getIdEvenement() {
        return idEvenement;
    }

    public void setIdEvenement(int idEvenement) {
        this.idEvenement = idEvenement;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public List<Integer> getVehiculesDisponibles() {
        return Collections.unmodifiableList(vehiculesDisponibles);
    }

    public void setVehiculesDisponibles(List<Integer> vehicules) {
        this.vehiculesDisponibles.clear();
        if (vehicules != null) {
            this.vehiculesDisponibles.addAll(vehicules);
        }
    }
}
