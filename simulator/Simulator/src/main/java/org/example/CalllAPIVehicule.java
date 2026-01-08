package org.example;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Locale;

public class CalllAPIVehicule {

    private static final String API_URL = "http://localhost:8082/api/vehicules/en-route";

    public List<VehiculeData> fetchVehiculesEnRoute() {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(API_URL)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200)
            {
                List<VehiculeData> vehicules = new ObjectMapper().readValue(response.body(), new TypeReference<List<VehiculeData>>() {});

                // --- AFFICHAGE DES POINTS GPS DANS LE TERMINAL ---
                System.out.println("\n--- Données reçues de l'API ---");
                for (VehiculeData v : vehicules) {
                    System.out.printf(Locale.US, "Véhicule [%s] : Position actuelle (Lat: %.6f, Lon: %.6f) -> Dest évènement [%s] (Lat: %.6f, Lon: %.6f)%n",
                            v.idVehicule, v.vehiculeLat, v.vehiculeLon, v.idEvenement, v.evenementLat, v.evenementLon, v.plaqueImmat);
                }
                System.out.println("-------------------------------\n");
                return vehicules;
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
        public String plaqueImmat;
    }
}