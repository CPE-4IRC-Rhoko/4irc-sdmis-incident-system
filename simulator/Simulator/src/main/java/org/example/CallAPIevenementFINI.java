package org.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

public class CallAPIevenementFINI {

    private static final String API_URL_TERMINEES = "https://api.4irc.hugorodrigues.fr/api/interventions/terminees";

    public static class InterventionTerminee {
        // On utilise JsonProperty pour mapper correctement même si le nom Java est différent
        @JsonProperty("idEvenement")
        public String idEvenement;
        
        @JsonProperty("idVehicule")
        public String idVehicule;
        
        public String idStatutIntervention;
        public String nomStatutIntervention;
        public String dateDebut;
        public String dateFin;
    }

    /**
     * Rendue PUBLIQUE pour être utilisée par DebutIntervention
     */
    public List<InterventionTerminee> fetchInterventionsTerminees(String token) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL_TERMINEES))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return new ObjectMapper().readValue(response.body(), new TypeReference<List<InterventionTerminee>>() {});
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur API Terminees : " + e.getMessage());
        }
        return List.of();
    }
}