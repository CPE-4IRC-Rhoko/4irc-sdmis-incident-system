package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

public class FinIntervention {

    private static final String API_URL = "http://localhost:8082/api/interventions/cloture";

    /**
     * Méthode pour clôturer l'intervention en envoyant un POST
     */
    public void cloturerIntervention(CalllAPIVehicule.VehiculeData v, String token) {
        try {
            ObjectMapper mapper = new ObjectMapper();

            // 1. Préparer les données à envoyer (idVehicule et idEvenement)
            Map<String, String> data = new HashMap<>();
            data.put("idVehicule", v.idVehicule);
            data.put("idEvenement", v.idEvenement);

            // 2. Convertir la Map en chaîne JSON
            String jsonBody = mapper.writeValueAsString(data);

            // 3. Construire la requête POST
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Content-Type", "application/json") // Très important pour le POST
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            System.out.println("Envoi de la clôture pour le véhicule " + v.idVehicule + "...");
            
            // 4. Envoyer et récupérer la réponse
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 204) 
            {
                System.out.println("Succès : Intervention clôturée pour le véhicule " + v.idVehicule);
                // Retour du véhicule à la caserne
                
            } else {
                System.err.println("Erreur API lors de la clôture (" + response.statusCode() + ") : " + response.body());
            }

        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi du POST : " + e.getMessage());
        }
    }
}