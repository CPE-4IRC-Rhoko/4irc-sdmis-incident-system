package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Test {

    public static void main(String[] args) {
        // --- CONFIGURATION ---
        String urlApi = "http://localhost:8082/api/vehicules/en-route"; // Modifie cette URL selon ton test
        // ---------------------

        AuthService authService = new AuthService();
        HttpClient client = HttpClient.newHttpClient();

        try {
            // 1. Récupération du token via ton nouveau service
            System.out.println("⏳ Récupération du token Keycloak...");
            String token = authService.getAccessToken();

            if (token == null) {
                System.err.println("❌ Échec : Impossible de récupérer le token.");
                return;
            }
            System.out.println("✅ Token obtenu avec succès.");

            // 2. Préparation de la requête vers ton API avec le Header Authorization
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlApi))
                    .header("Authorization", "Bearer " + token) // Ajout du token
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            System.out.println("🌐 Appel de l'API : " + urlApi);

            // 3. Envoi de la requête
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            // 4. Affichage du résultat
            System.out.println("\n--- RÉSULTAT DE L'API ---");
            System.out.println("Code Statut : " + response.statusCode());
            System.out.println("Corps de la réponse :");
            System.out.println(response.body());
            System.out.println("--------------------------");

            if (response.statusCode() == 401 || response.statusCode() == 403) {
                System.err.println("⚠️ Erreur d'autorisation : Le token est peut-être invalide ou n'a pas les droits nécessaires.");
            }

        } catch (Exception e) {
            System.err.println("❌ Erreur lors du test : " + e.getMessage());
            e.printStackTrace();
        }
    }
}