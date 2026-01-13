package org.example;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

public class CallAPICaserne {

    private static final String API_URL_TEMPLATE = "https://api.4irc.hugorodrigues.fr/api/vehicules/%s/caserne";

    // Modèle pour mapper le JSON de la caserne
    public static class CaserneData {
        public String id_caserne;
        public String nom_de_la_caserne;
        public int numero_rue;
        public String nom_rue;
        public String ville;
        public double latitude;
        public double longitude;
    }

    // --- TEST INDÉPENDANT ---
    public static void main(String[] args) {
        System.out.println("🚀 Test de récupération des coordonnées de caserne...");

        // 1. On récupère le token via ton AuthService
        AuthService auth = new AuthService();
        String monToken = auth.getAccessToken();

        System.err.println("Token récupéré : " + monToken);

        if (monToken != null) {
            // 2. On prépare un véhicule de test
            CalllAPIVehicule.VehiculeData vTest = new CalllAPIVehicule.VehiculeData();
            // Remplace par un ID valide pour ton test
            vTest.idVehicule = "4f584bfc-29cf-4f5a-897c-382437a36548";

            // 3. On lance l'appel
            CallAPICaserne serviceCaserne = new CallAPICaserne();
            serviceCaserne.recupererCaserne(vTest, monToken);
        } else {
            System.err.println("❌ Impossible de continuer sans token.");
        }
    }

    public CaserneData recupererCaserne(CalllAPIVehicule.VehiculeData v, String token)
    {
        String urlFinale = String.format(API_URL_TEMPLATE, v.idVehicule);
        HttpClient client = HttpClient.newHttpClient();
        ObjectMapper mapper = new ObjectMapper();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(urlFinale))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .GET()
                .build();

        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                // L'API renvoie un OBJET DIRECT { ... } et non une liste [ {...} ]
                // On utilise donc CaserneData.class au lieu de TypeReference<List<...>>
                CaserneData caserne = mapper.readValue(response.body(), CaserneData.class);
                return caserne;
            } else {
                System.err.println("❌ Erreur API Caserne (Code " + response.statusCode() + ") : " + response.body());
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur de lecture du JSON Caserne : " + e.getMessage());
            // Affiche la réponse reçue pour vérifier en cas de nouveau problème
            // System.out.println("Corps reçu : " + response.body());
        }
        return null;
    }
}