package org.example;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

public class SendAPI
{
    private final IncidentGPS incidentGPS;

    public SendAPI() {
        this.incidentGPS = new IncidentGPS();
    }

    private static final String API_URL = "http://localhost:8082/api/evenements";

    public void envoyerEvenement(TypeEvenement evenement) throws IOException {

        // Récupération des informations depuis TypeEvenement
        String severite = evenement.getNomSeverite();
        String nom = evenement.getNomTypeEvenement();
        String description = evenement.getDescription();

        // Récupération coordonnées GPS
        double[] coordonnees = incidentGPS.getBbox();
        double latitude = coordonnees[0];
        double longitude = coordonnees[1];

        try {
            // Création du client HTTP
            HttpClient client = HttpClient.newHttpClient();

            // Corps JSON
            String jsonBody = String.format(
                    Locale.US,
                    """
                    {
                      "description": "%s",
                      "latitude": %.5f,
                      "longitude": %.5f,
                      "nomTypeEvenement": "%s",
                      "nomSeverite": "%s"
                    }
                    """,
                    description, latitude, longitude, nom, severite
            );

            System.out.println("=== JSON envoyé ===");
            System.out.println(jsonBody);

            // Création de la requête POST
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            // Envoi
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());

            // Résultat
            System.out.println("Code HTTP : " + response.statusCode());
            System.out.println("Réponse   : " + response.body());

        } catch (Exception e) {
            System.err.println("Erreur POST API : " + e.getMessage());
            e.printStackTrace();
        }
    }
}
