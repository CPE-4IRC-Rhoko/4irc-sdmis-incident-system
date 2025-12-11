package org.example.moteurdecision.messaging;

import java.time.Instant;

/**
 * Message renvoyé à l'API pour confirmer (ou non) l'intervention créée.
 */
public class InterventionMessage {

    private int idEvenement;
    private int vehiculeId;
    private boolean succes;
    private String message;
    private String causeEchec;
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

    public boolean isSucces() {
        return succes;
    }

    public void setSucces(boolean succes) {
        this.succes = succes;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getCauseEchec() {
        return causeEchec;
    }

    public void setCauseEchec(String causeEchec) {
        this.causeEchec = causeEchec;
    }

    public Instant getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(Instant dateCreation) {
        this.dateCreation = dateCreation;
    }
}
