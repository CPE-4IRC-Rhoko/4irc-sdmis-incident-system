package org.example;

import okhttp3.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.*;

public class IncidentGPS {
    private static final String GEO_API_URL = "https://geo.api.gouv.fr/communes?nom=Lyon&fields=code,nom,bbox";
    private final OkHttpClient client = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public double[] getBbox() throws IOException
    {
        Request request = new Request.Builder()
                .url(GEO_API_URL)
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) throw new IOException("Erreur API Geo.gouv.fr: " + response);

            String body = response.body().string();
            JsonNode root = objectMapper.readTree(body);
            JsonNode communeNode = root.get(0);
            ;

            // --- RECUP DES POINT DE LA VILLE ---

            //On récupère les coordonnées des points GPS
            JsonNode coordonne = communeNode.path("bbox").path("coordinates").get(0);

            //System.out.println(body);
            //System.out.println(coordonne);

            // --- DETERMINE LE MAX ET LE MIN DE CES POINTS ---

            // Initialiser les variables pour stocker les extrémités
            double minLon = Double.MAX_VALUE;
            double maxLon = Double.MIN_VALUE;
            double minLat = Double.MAX_VALUE;
            double maxLat = Double.MIN_VALUE;

            // On stock chaque point dans une variable afin de pouvoir les réutiliser
            for (JsonNode point : coordonne) {
                //System.out.println(point);
                double lon = point.get(0).asDouble(); // index 0 → long
                double lat = point.get(1).asDouble(); // index 1 → lat

                // longitude minimale
                if (lon < minLon) {
                    minLon = lon;
                }
                // longitude maximale
                if (lon > maxLon) {
                    maxLon = lon;
                }

                // latitude minimale
                if (lat < minLat) {
                    minLat = lat;
                }
                // latitude maximale
                if (lat > maxLat) {
                    maxLat = lat;
                }
            }

            /*
            System.out.println("\n===Extrémité de la BBOX ===");
            System.out.printf("  Longitude Min : %.5f\n", minLon);
            System.out.printf("  Longitude Max : %.5f\n", maxLon);
            System.out.printf("  Latitude Min  : %.5f\n", minLat);
            System.out.printf("  Latitude Max  : %.5f\n", maxLat);
            */

            // --- GÉNÉRATION POINT ALÉATOIRE ---
            Random rand = new Random();

            double randomLat = minLat + (maxLat - minLat) * rand.nextDouble();
            double randomLon = minLon + (maxLon - minLon) * rand.nextDouble();

            /*
            System.out.println("\n=== Point GPS aléatoire ===");
            System.out.printf(Locale.US, "Point aléatoire = lat= %.5f, lon= %.5f%n", randomLat, randomLon);
            */

            return new double[]{randomLat, randomLon};
        }
    }
}
