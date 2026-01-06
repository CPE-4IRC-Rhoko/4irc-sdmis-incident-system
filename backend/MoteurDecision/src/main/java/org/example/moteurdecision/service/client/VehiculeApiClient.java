package org.example.moteurdecision.service.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Client HTTP minimal pour récupérer les véhicules sélectionnés pour un évènement auprès de l'API.
 */
public class VehiculeApiClient {

    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public VehiculeApiClient(String baseUrl, ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public List<UUID> recupererVehiculesSelectionnes(UUID eventId) throws Exception {
        URI uri = URI.create(baseUrl + "/api/evenements/" + eventId + "/vehicules-selectionnes");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            JsonNode root = objectMapper.readTree(response.body());
            return toVehiculeIds(root);
        }
        throw new IllegalStateException("Appel API vehicules-selectionnes renvoie " + response.statusCode());
    }

    private List<UUID> toVehiculeIds(JsonNode root) {
        if (root == null || !root.isArray()) {
            return List.of();
        }
        List<UUID> builder = new ArrayList<>();
        for (JsonNode node : root) {
            if (node.hasNonNull("idVehicule")) {
                builder.add(UUID.fromString(node.get("idVehicule").asText()));
            }
        }
        return builder;
    }
}
