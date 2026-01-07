package org.example.moteurdecision.messaging;

import java.time.Instant;
import java.util.UUID;

/**
 * Message renvoyé à l'API pour confirmer (ou non) l'intervention créée.
 */
public class InterventionMessage {

    private UUID idEvenement;
    private UUID vehiculeId;
    private boolean succes;
    private String message;
    private String causeEchec;
    private Instant dateCreation;

    public UUID getIdEvenement() {
        return idEvenement;
    }

    public void setIdEvenement(UUID idEvenement) {
        this.idEvenement = idEvenement;
    }

    public UUID getVehiculeId() {
        return vehiculeId;
    }

    public void setVehiculeId(UUID vehiculeId) {
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
