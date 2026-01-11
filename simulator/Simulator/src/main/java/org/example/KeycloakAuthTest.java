package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.util.Map;

public class KeycloakAuthTest {

    public static void main(String[] args) {
        // --- CONFIGURATION À REMPLIR ---
        String serverUrl   = "https://auth.4irc.hugorodrigues.fr"; 
        String realm       = "SDMIS";
        String clientId    = "sdmis-simulateur-java";
        String clientSecret = "u7dwjUN2NDu9XOvWSQPENIihoSHZH500";
        // -------------------------------

        String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        // Construction du corps de la requête (Format x-www-form-urlencoded)
        String formData = "grant_type=client_credentials" +
                          "&client_id=" + clientId +
                          "&client_secret=" + clientSecret;

        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(formData))
                .build();

        System.out.println("Tentative de connexion à : " + tokenUrl);

        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                System.out.println("✅ SUCCÈS ! Token reçu :");
                System.out.println(response.body()); // Affiche le JSON contenant l'access_token
            } else {
                System.err.println("❌ ÉCHEC de l'authentification");
                System.err.println("Code d'erreur : " + response.statusCode());
                System.err.println("Réponse du serveur : " + response.body());
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la requête : " + e.getMessage());
            e.printStackTrace();
        }
    }
}