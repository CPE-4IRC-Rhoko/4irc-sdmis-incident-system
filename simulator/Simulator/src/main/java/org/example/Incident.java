package org.example;

import java.util.Date;
import java.util.regex.Pattern;

public class Incident {
    // Attributs
    private String typeDeLIncident;
    private int severite;
    private double latitude;
    private double longitude;
    private String status;
    private Date dateDeCreation;

    // Constructeur
    public Incident(String typeDeLIncident, int severite, double latitude, double longitude, String status) {
        this.typeDeLIncident = typeDeLIncident;
        this.severite = severite;
        this.latitude = latitude;
        this.longitude = longitude;
        this.status = status;
        this.dateDeCreation = new Date();  // Date actuelle
    }

    // Getters et setters
    public String getTypeDeLIncident() {
        return typeDeLIncident;
    }

    public void setTypeDeLIncident(String typeDeLIncident) {
        // Vérification du pattern pour le type de l'incident
        String regex = "^[A-Za-z\\s]+$";  // Exemple de pattern (ici, uniquement des lettres et des espaces)
        if(Pattern.matches(regex, typeDeLIncident)) {
            this.typeDeLIncident = typeDeLIncident;
        } else {
            throw new IllegalArgumentException("Type d'incident invalide. Utilisez uniquement des lettres et des espaces.");
        }
    }

    public int getSeverite() {
        return severite;
    }

    public void setSeverite(int severite) {
        if(severite >= 1 && severite <= 10) {  // On suppose une échelle de 1 à 10 pour la sévérité
            this.severite = severite;
        } else {
            throw new IllegalArgumentException("La sévérité doit être comprise entre 1 et 10.");
        }
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        // Vérification du statut
        this.status = "N";
    }

    public Date getDateDeCreation() {
        return dateDeCreation;
    }

    // Méthode toString pour afficher les informations de l'incident
    @Override
    public String toString() {
        return "Incident{" +
                "typeDeLIncident='" + typeDeLIncident + '\'' +
                ", severite=" + severite +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", status='" + status + '\'' +
                ", dateDeCreation=" + dateDeCreation +
                '}';
    }
}
