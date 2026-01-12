package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public class CalllAPIVehicule {

    private static final String API_URL = "http://localhost:8082/api/vehicules/en-route";

    public static class Equipement
    {
        public String nomEquipement;
        public int contenanceCourante;
    }

    public List<VehiculeData> fetchVehiculesEnRoute(String token)
    {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200)
            {
                List<VehiculeData> vehicules = new ObjectMapper().readValue(response.body(), new TypeReference<List<VehiculeData>>() {});
                return vehicules;
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des véhicules : " + e.getMessage());
        }
        return List.of();
    }

    public static class VehiculeData
    {
        public String idVehicule;
        public double vehiculeLat;
        public double vehiculeLon;
        public String idEvenement;
        public double evenementLat;
        public double evenementLon;
        public String plaqueImmat;
        public List<Equipement> equipements;

        public Equipement getPremierEquipement()
        {
            if (equipements == null || equipements.isEmpty())
            {
                return null;
            }
            return equipements.get(0);
        }

        public String getNomEquipement()
        {
            Equipement e = getPremierEquipement();
            return e != null ? e.nomEquipement : null;
        }

        public Integer getContenanceCourante()
        {
            Equipement e = getPremierEquipement();
            return e != null ? e.contenanceCourante : null;
        }
    }
}