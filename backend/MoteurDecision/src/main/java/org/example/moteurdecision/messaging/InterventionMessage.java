package org.example.moteurdecision.messaging;

import java.time.Instant;

/**
 * Message renvoyé à l'API pour confirmer l'intervention créée.
 */
public class InterventionMessage {

    private int idEvenement;
    private int vehiculeId;
    private String message;
    private Instant dateCreation;

    public int getIdEvenement() {
        return idEvenement;
    }

    public void setIdEvenement(int idEvenement) {
        this.idEvenement = idEvenement;
    }

    public int getVehiculeId() {
        return vehiculeId;
    }

    public void setVehiculeId(int vehiculeId) {
        this.vehiculeId = vehiculeId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(Instant dateCreation) {
        this.dateCreation = dateCreation;
    }
}
