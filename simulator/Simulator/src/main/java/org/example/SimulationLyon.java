package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class SimulationLyon {

    // --- Configuration de la simulation ---
    private static final double VITESSE_KMH = 40.0;       // Vitesse du véhicule (urbain)
    private static final int RAFRAICHISSEMENT_MS = 200;   // Mise à jour toutes les 0.2s

    // Calcul de la distance parcourue à chaque "pas" de simulation
    private static final double DISTANCE_PAR_PAS = (VITESSE_KMH / 3.6) * (RAFRAICHISSEMENT_MS / 1000.0);

    public static void main(String[] args) {
        try {
            // 1. Points GPS (Place Bellecour -> Part-Dieu)
            double latDep = 45.7577; double lonDep = 4.8321;
            double latArr = 45.7605; double lonArr = 4.8600;

            // 2. Construction de l'URL OSRM (Format: Longitude,Latitude)
            String url = String.format(Locale.US,
                    "http://localhost:5000/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",
                    lonDep, latDep, lonArr, latArr);

            System.out.println("Appel à l'API OSRM locale...");

            // 3. Requête HTTP
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("Erreur API : " + response.body());
                return;
            }

            // 4. Analyse JSON des points de la route
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.body());
            JsonNode coordinates = root.path("routes").get(0).path("geometry").path("coordinates");

            if (coordinates.isMissingNode()) {
                System.err.println("Aucun itinéraire trouvé ! Vérifiez vos coordonnées.");
                return;
            }

            System.out.println("Itinéraire reçu. Lancement de la simulation à " + VITESSE_KMH + " km/h...");
            System.out.println("--------------------------------------------------");

            // 5. Boucle de simulation point par point
            for (int i = 0; i < coordinates.size() - 1; i++) {
                double lon1 = coordinates.get(i).get(0).asDouble();
                double lat1 = coordinates.get(i).get(1).asDouble();
                double lon2 = coordinates.get(i + 1).get(0).asDouble();
                double lat2 = coordinates.get(i + 1).get(1).asDouble();

                // Calcul de la distance du segment réel (entre deux virages fournis par OSRM)
                double distSegment = haversine(lat1, lon1, lat2, lon2);

                // Calcul du nombre de petits pas pour simuler la fluidité sur ce segment
                int nbPas = (int) (distSegment / DISTANCE_PAR_PAS);
                if (nbPas < 1) nbPas = 1; // Au moins un pas même si c'est très court

                for (int j = 0; j <= nbPas; j++) {
                    double fraction = (double) j / nbPas;

                    // Interpolation linéaire entre les deux points
                    double currentLat = lat1 + (lat2 - lat1) * fraction;
                    double currentLon = lon1 + (lon2 - lon1) * fraction;

                    // AFFICHAGE : C'est ici que tu mettrais à jour ton interface
                    System.out.printf(Locale.US, "VÉHICULE : Lat %.6f | Lon %.6f%n", currentLat, currentLon);

                    Thread.sleep(RAFRAICHISSEMENT_MS);
                }
            }

            System.out.println("--------------------------------------------------");
            System.out.println("Arrivée à la Gare Part-Dieu !");

        } catch (Exception e) {
            System.err.println("Erreur durant la simulation : " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Calcule la distance en mètres entre deux coordonnées GPS
     */
    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Rayon de la Terre en mètres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
