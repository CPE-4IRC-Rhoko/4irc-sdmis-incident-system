package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

public class FinIntervention {

    private static final String API_URL = "https://api.4irc.hugorodrigues.fr/api/interventions/cloture";

    /**
     * Méthode pour clôturer l'intervention en envoyant un POST avec des valeurs fixes
     */
    public void cloturerIntervention(CalllAPIVehicule.VehiculeData v, String token) {
        try {

            ObjectMapper mapper = new ObjectMapper();
            CallAPICaserne caserneService = new CallAPICaserne();

            // 1. Préparer les données avec les valeurs fixées
            Map<String, String> data = new HashMap<>();
            data.put("id_evenement", v.idEvenement);
            data.put("id_vehicule", v.idVehicule);

            // 2. Convertir la Map en chaîne JSON
            String jsonBody = mapper.writeValueAsString(data);

            // 3. Construire la requête POST
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            System.out.print("JSON BRUT ENVOYÉ : ");
            System.out.println(jsonBody);

            System.out.println("Envoi de la clôture (Fixe) : Vehicule=" + v.idVehicule + ", Event=" + v.idEvenement);
            
            // 4. Envoyer et récupérer la réponse
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 204)
            {
                System.out.println("✅ Succès : Intervention clôturée (Valeurs fixes)");
                
            } else {
                System.err.println("❌ Erreur API lors de la clôture (" + response.statusCode() + ") : " + response.body());
            }

        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi du POST : " + e.getMessage());
        }
    }
}