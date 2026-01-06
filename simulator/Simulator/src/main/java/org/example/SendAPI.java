package org.example;

import java.io.IOException;

public class SendAPI
{
    private final IncidentGPS incidentGPS;

    public SendAPI() {
        this.incidentGPS = new IncidentGPS();
    }

    public void envoyerEvenement(TypeEvenement evenement) throws IOException {

        // Récupération des informations depuis TypeEvenement
        String severite = evenement.getNomSeverite();
        String nom = evenement.getNomTypeEvenement();
        String description = evenement.getDescription();

        // Récupération coordonnées GPS
        double[] coordonnees = incidentGPS.getBbox();
        double latitude = coordonnees[0];
        double longitude = coordonnees[1];

        // Exemple d'utilisation (console / futur appel API)
        System.out.println("=== Envoi de l'incident ===");
        System.out.println("Sévérité   : " + severite);
        System.out.println("Nom        : " + nom);
        System.out.println("Description: " + description);
        System.out.printf("Latitude   : %.5f%n", latitude);
        System.out.printf("Longitude  : %.5f%n", longitude);
    }
}
