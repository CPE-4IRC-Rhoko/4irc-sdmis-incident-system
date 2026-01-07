package fr.cpe.sdmis.messaging;
import java.util.UUID;

/**
 * Payload envoyé vers RabbitMQ pour signaler un nouvel événement.
 */
public class EventMessage {
    private UUID idEvenement;
    private String description;
    private double latitude;
    private double longitude;
    private UUID idTypeEvenement;
    private UUID idStatut;
    private UUID idSeverite;

    public UUID getIdEvenement() {
        return idEvenement;
    }

    public void setIdEvenement(UUID idEvenement) {
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

    public UUID getIdTypeEvenement() {
        return idTypeEvenement;
    }

    public void setIdTypeEvenement(UUID idTypeEvenement) {
        this.idTypeEvenement = idTypeEvenement;
    }

    public UUID getIdStatut() {
        return idStatut;
    }

    public void setIdStatut(UUID idStatut) {
        this.idStatut = idStatut;
    }

    public UUID getIdSeverite() {
        return idSeverite;
    }

    public void setIdSeverite(UUID idSeverite) {
        this.idSeverite = idSeverite;
    }
}
