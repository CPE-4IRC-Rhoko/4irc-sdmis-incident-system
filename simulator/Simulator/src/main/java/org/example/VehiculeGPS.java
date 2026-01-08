package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Locale;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class VehiculeGPS {

    private static final double VITESSE_KMH = 200.0;
    private static final int RAFRAICHISSEMENT_MS = 50;
    private static final double DISTANCE_PAR_PAS = (VITESSE_KMH / 3.6) * (RAFRAICHISSEMENT_MS / 1000.0);

    public static void main(String[] args) {
        // 1. Appeler l'autre classe pour récupérer les données de l'API
        CalllAPIVehicule apiCaller = new CalllAPIVehicule();
        List<CalllAPIVehicule.VehiculeData> listeVehicules = apiCaller.fetchVehiculesEnRoute();

        if (listeVehicules.isEmpty()) {
            System.out.println("Aucun véhicule à simuler.");
            return;
        }

        // 2. Initialiser l'émetteur Micro:bit une seule fois
        MicrobitSender emetteur = new MicrobitSender("COM3");
        try { Thread.sleep(2000); } catch (Exception e) {}

        // 3. Boucler sur chaque véhicule récupéré
        for (CalllAPIVehicule.VehiculeData v : listeVehicules) {
            System.out.println("\n>>> Simulation du véhicule : " + v.vehiculeLat);
            System.out.println("\n>>> Latitude : " + v.vehiculeLat + "Longitude  :" + v.vehiculeLon);
            simulerTrajet(v, emetteur);
        }

        emetteur.close();
        System.out.println("Toutes les simulations sont terminées.");
    }

    private static void simulerTrajet(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur) {
        try {

            // Coordonnées fixes de la destination (ex: Gare Part-Dieu)
            //double DEST_LAT_FIXE = 45.765646;
            //double DEST_LON_FIXE = 4.865712;

            // Utilisation des coordonnées dynamiques de l'API
            String url = String.format(Locale.US,
                    "http://localhost:5000/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",
                    v.vehiculeLon, v.vehiculeLat, v.evenementLon, v.evenementLat);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.body());
            JsonNode coordinates = root.path("routes").get(0).path("geometry").path("coordinates");

            if (coordinates.isMissingNode()) return;

            //int monEau = 85;
            String resources = "eau=80";

            for (int i = 0; i < coordinates.size() - 1; i++) {
                double lon1 = coordinates.get(i).get(0).asDouble();
                double lat1 = coordinates.get(i).get(1).asDouble();
                double lon2 = coordinates.get(i + 1).get(0).asDouble();
                double lat2 = coordinates.get(i + 1).get(1).asDouble();

                double distSegment = haversine(lat1, lon1, lat2, lon2);
                int nbPas = (int) (distSegment / DISTANCE_PAR_PAS);
                if (nbPas < 1) nbPas = 1;

                for (int j = 0; j <= nbPas; j++) {
                    double fraction = (double) j / nbPas;
                    double currentLat = lat1 + (lat2 - lat1) * fraction;
                    double currentLon = lon1 + (lon2 - lon1) * fraction;

                    // ENVOI MICRO:BIT
                    System.out.printf(Locale.US, "ID: %s | Lat %.6f | Lon %.6f%n | Res %s \n" , v.plaqueImmat, currentLat, currentLon, resources);
                    emetteur.envoyerDonnees(v.plaqueImmat, currentLat, currentLon, resources);
                    Thread.sleep(RAFRAICHISSEMENT_MS);
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur trajet " + v.idVehicule + " : " + e.getMessage());
        }
    }

    private static double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}