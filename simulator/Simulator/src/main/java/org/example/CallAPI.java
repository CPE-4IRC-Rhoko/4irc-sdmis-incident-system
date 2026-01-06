package org.example;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class CallAPI {

    private static final String API_URL = "http://localhost:8082/api/evenements";
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Random random;

    public CallAPI() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.random = new Random();
    }

    /**
     * Récupère tous les événements depuis l'API
     * @return Liste des événements
     * @throws IOException En cas d'erreur de communication
     * @throws InterruptedException Si la requête est interrompue
     */
    public List<TypeEvenement> recupererEvenements() throws IOException, InterruptedException {
        // Créer la requête HTTP GET
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/json")
                .GET()
                .build();

        // Envoyer la requête et récupérer la réponse
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        // Vérifier le code de statut
        if (response.statusCode() != 200) {
            throw new IOException("Erreur API: Code " + response.statusCode());
        }

        // Parser le JSON et extraire les événements
        return extraireEvenements(response.body());
    }

    /**
     * Extrait les événements du JSON de réponse
     * @param jsonResponse La réponse JSON de l'API
     * @return Liste des événements avec sévérité, type et description
     * @throws IOException En cas d'erreur de parsing JSON
     */
    private List<TypeEvenement> extraireEvenements(String jsonResponse) throws IOException {
        List<TypeEvenement> evenements = new ArrayList<>();

        // Parser le JSON
        JsonNode rootNode = objectMapper.readTree(jsonResponse);

        // Si c'est un tableau
        if (rootNode.isArray()) {
            for (JsonNode node : rootNode) {
                String nomSeverite = node.get("nomSeverite").asText();
                String nomType = node.get("nomTypeEvenement").asText();
                String description = node.get("description").asText();
                evenements.add(new TypeEvenement(nomSeverite, nomType, description));
            }
        }

        return evenements;
    }

    /**
     * Sélectionne un événement aléatoire depuis une liste existante
     * @param evenements Liste des événements
     * @return Un événement aléatoire de la liste
     * @throws IllegalArgumentException Si la liste est vide ou nulle
     */
    public TypeEvenement selectionnerEvenementAleatoire(List<TypeEvenement> evenements) {
        if (evenements == null || evenements.isEmpty()) {
            throw new IllegalArgumentException("La liste d'événements est vide ou nulle");
        }

        int indexAleatoire = random.nextInt(evenements.size());
        return evenements.get(indexAleatoire);
    }

    /**
     * Méthode principale pour tester
     */
    public static void main(String[] args) {
        CallAPI callAPI = new CallAPI();

        try {

            /*EVENEMENTS ALEATOIRES*/
            List<TypeEvenement> evenements = callAPI.recupererEvenements();
            TypeEvenement evenementsAleatoire = callAPI.selectionnerEvenementAleatoire(evenements);
            System.out.println("Événement récupéré :");
            System.out.println(evenementsAleatoire);

        } catch (IOException | InterruptedException e) {
            System.err.println("Erreur lors de l'appel API : " + e.getMessage());
            e.printStackTrace();
        }
    }
}