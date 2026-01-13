package org.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;

public class TestOSRM {

    public static void main(String[] args) throws Exception {

        HttpClient client = HttpClient.newHttpClient();
        ObjectMapper mapper = new ObjectMapper();

        // Part-Dieu -> Bellecour
        double startLat = 45.760087;
        double startLon = 4.861915;
        double endLat   = 45.757813;
        double endLon   = 4.832011;

        String url = String.format(
                Locale.US,
                "https://api-osrm.4irc.hugorodrigues.fr/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",
                startLon, startLat, endLon, endLat
        );

        System.out.println("URL appelée :");
        System.out.println(url);
        System.out.println("----");

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        JsonNode root = mapper.readTree(response.body());
        JsonNode coordinates = root
                .path("routes")
                .get(0)
                .path("geometry")
                .path("coordinates");

        if (coordinates == null || !coordinates.isArray()) {
            System.err.println("Aucune coordonnée retournée !");
            return;
        }

        System.out.println("Points GPS retournés :");
        for (int i = 0; i < coordinates.size(); i++) {
            double lon = coordinates.get(i).get(0).asDouble();
            double lat = coordinates.get(i).get(1).asDouble();

            System.out.printf(Locale.US,
                    "Point %03d -> Lat: %.6f | Lon: %.6f%n",
                    i, lat, lon);
        }
    }
}
