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

    private static final String API_URL_TYPE_EVENEMENT = "https://api.4irc.hugorodrigues.fr/api/references/types-evenement";
    private static final String API_URL_SEVERTIE = "https://api.4irc.hugorodrigues.fr/api/references/severites";
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
    public List<TypeEvenement> recupererEvenements(String token) throws IOException, InterruptedException {
        // Créer les requêtes HTTP GET
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL_TYPE_EVENEMENT))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpRequest request2 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL_SEVERTIE))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        // Envoyer les requêtes et récupérer les réponses
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        HttpResponse<String> response2 = httpClient.send(request2, HttpResponse.BodyHandlers.ofString());


        // Vérifier le code de statut
        if (response.statusCode() != 200 || response2.statusCode() != 200) {
            throw new IOException("Erreur API: Code " + response.statusCode());
        }

        List<String> liste1 = extraireTypes(response.body());
        List<String> liste2 = extraireSeverites(response2.body());

        List<TypeEvenement> resultatFinal = new ArrayList<>();

        for (String type : liste1) {
            for (String severite : liste2)
            {
                resultatFinal.add(new TypeEvenement(severite, type, "Description générée par Maxence"));
            }
        }

        return resultatFinal;
    }

    private List<String> extraireTypes(String json) throws IOException {
        List<String> types = new ArrayList<>();
        JsonNode root = objectMapper.readTree(json);

        for (JsonNode node : root) {
            types.add(node.get("nom").asText());
        }
        return types;
    }

    private List<String> extraireSeverites(String json) throws IOException {
        List<String> severites = new ArrayList<>();
        JsonNode root = objectMapper.readTree(json);

        for (JsonNode node : root) {
            severites.add(node.get("nomSeverite").asText());
        }
        return severites;
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
}



