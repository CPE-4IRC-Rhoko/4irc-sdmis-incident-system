package org.example;

import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.io.IOException;

public class Main {
    public static void main(String[] args) throws IOException {

       VehiculeGPS generateur = new VehiculeGPS();
       double[] bboxCoords = generateur.getBbox();
       double lat = bboxCoords[0];
       double lon = bboxCoords[1];
       System.out.println("Position vehicule Latitude (Min/Max) : " + lat);
       System.out.println("Position vehicule Longitude (Min/Max): " + lon);

       IncidentGPS generateur2 = new IncidentGPS();
       double[] bboxCoords2 = generateur2.getBbox();
       double lat2 = bboxCoords2[0];
       double lon2 = bboxCoords2[1];
       System.out.println("Position Incident Latitude (Min/Max) : " + lat2);
       System.out.println("Position Incident Longitude (Min/Max): " + lon2);


       // 1. Initialisation (à faire une seule fois au début)
       // Remplace "COM3" par le bon port de ta Micro:bit Terrain
       MicrobitSender emetteur = new MicrobitSender("COM3");

       // Attendre 2 secondes que le port soit prêt (recommandé)
       try { Thread.sleep(2000); } catch (Exception e) {}

       // Tes calculs actuels...
       int monId = 30;
       int monEau = 50;

       // 2. Envoi des données
       emetteur.envoyerDonnees(monId, lat, lon, monEau);

       // IMPORTANT : Faire une petite pause si tu as plusieurs camions
       // pour ne pas saturer le tampon de réception de la Micro:bit
       try { Thread.sleep(50); } catch (Exception e) {}

       // 3. Fermeture à la fin
       emetteur.close();
    }

        /*
        // Création d'une instance Random pour sélectionner un type aléatoire
        List<String> typesIncidents = Arrays.asList(
                "Accident de voiture",
                "Blessure sportive",
                "Chute accidentelle",
                "Incendie domestique",
                "Malaises médicaux"
        );
        Random random = new Random();
        // Choisir un type d'incident aléatoire dans la liste
        String typeDeLIncident = typesIncidents.get(random.nextInt(typesIncidents.size()));

        try {
            Incident incident = new Incident(typeDeLIncident, 5, 48.8566, 2.3522, "F");
            System.out.println(incident);
        } catch (IllegalArgumentException e) {
            System.err.println("Erreur : " + e.getMessage());
        }
        */

}
