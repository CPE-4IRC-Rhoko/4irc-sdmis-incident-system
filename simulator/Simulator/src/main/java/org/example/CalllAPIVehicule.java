package org.example;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

public class CalllAPIVehicule {

    private static final String API_URL = "http://localhost:8082/api/vehicules/en-route";

    public List<VehiculeData> fetchVehiculesEnRoute() {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(API_URL)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return new ObjectMapper().readValue(response.body(), new TypeReference<List<VehiculeData>>() {});
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des véhicules : " + e.getMessage());
        }
        return List.of();
    }

    public static class VehiculeData {
        public String idVehicule;
        public double vehiculeLat;
        public double vehiculeLon;
        public String idEvenement;
        public double evenementLat;
        public double evenementLon;
    }
}