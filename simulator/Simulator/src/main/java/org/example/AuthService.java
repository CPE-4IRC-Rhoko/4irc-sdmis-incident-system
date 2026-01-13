package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.cdimascio.dotenv.Dotenv;

public class AuthService {

    // Configuration Keycloak
    private final String clientSecret;

    private final String serverUrl = "https://auth.4irc.hugorodrigues.fr";
    private final String realm = "SDMIS";
    private final String clientId = "sdmis-simulateur-java";

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 2. CRÉER UN CONSTRUCTEUR pour charger le secret une seule fois au démarrage
    public AuthService() {
    // On essaie de charger le .env
    Dotenv dotenv = Dotenv.configure().directory("C:\\Users\\Maxence\\Documents\\CPE\\ProjetTransverse\\Repo_GIT_Project\\4irc-sdmis-incident-system\\simulator\\Simulator").load();
    String secret = dotenv.get("TOKEN_KC");
    this.clientSecret = secret;
}

    /**
     * Récupère un nouveau jeton d'accès (Access Token) auprès de Keycloak.
     * @return Le token sous forme de String ou null en cas d'échec.
     */
    public String getAccessToken() {
        String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";
        String formData = "grant_type=client_credentials" +
                          "&client_id=" + clientId +
                          "&client_secret=" + clientSecret;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(formData))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // On utilise Jackson pour lire le champ "access_token" dans le JSON
                JsonNode rootNode = objectMapper.readTree(response.body());
                return rootNode.get("access_token").asText();
            } else {
                System.err.println("❌ Erreur Keycloak (" + response.statusCode() + ") : " + response.body());
                return null;
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la récupération du token : " + e.getMessage());
            return null;
        }
    }
}