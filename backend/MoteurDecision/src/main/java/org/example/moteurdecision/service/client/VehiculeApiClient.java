package org.example.moteurdecision.service.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.moteurdecision.domain.Vehicule;
import org.example.moteurdecision.domain.status.StatutVehicule;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Client HTTP minimal pour récupérer les véhicules disponibles auprès de l'API.
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

    public List<Vehicule> recupererVehiculesDisponibles() throws Exception {
        URI uri = URI.create(baseUrl + "/api/vehicules/disponibles");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            JsonNode root = objectMapper.readTree(response.body());
            return toVehicules(root);
        }
        throw new IllegalStateException("Appel API vehicules/disponibles renvoie " + response.statusCode());
    }

    private List<Vehicule> toVehicules(JsonNode root) {
        if (root == null || !root.isArray()) {
            return List.of();
        }
        List<Vehicule> builder = new ArrayList<>();
        for (JsonNode node : root) {
            builder.add(toVehicule(node));
        }
        return builder;
    }

    private Vehicule toVehicule(JsonNode node) {
        UUID id = UUID.fromString(node.path("id").asText());
        double latitude = node.path("latitude").asDouble();
        double longitude = node.path("longitude").asDouble();
        UUID idStatut = UUID.fromString(node.path("idStatut").asText());
        String nomStatut = node.path("nomStatut").asText();
        boolean operationnel = node.path("operationnel").asBoolean();

        StatutVehicule statut = new StatutVehicule(idStatut, nomStatut, operationnel);
        return new Vehicule(id, latitude, longitude, statut);
    }
}
