package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class VehiculeGPS {

    private static final double VITESSE_KMH = 200.0;
    private static final int RAFRAICHISSEMENT_MS = 100;
    private static final double DISTANCE_PAR_PAS = (VITESSE_KMH / 3.6) * (RAFRAICHISSEMENT_MS / 1000.0);

    public static void main(String[] args)
    {
        CalllAPIVehicule apiCaller = new CalllAPIVehicule();
        MicrobitSender emetteur = new MicrobitSender("COM3");
        try { Thread.sleep(2000); } catch (Exception e) {}

        DebutIntervention action = new DebutIntervention();
        FinIntervention cloture = new FinIntervention();

        // Registre pour ne pas lancer deux fois le même véhicule
        Set<String> vehiculesEnCours = Collections.synchronizedSet(new HashSet<>());

        System.out.println(">>> Surveillance des incidents démarrée...");

        while (true) { // Boucle infinie
            try {
                // 1. On récupère la liste actuelle de l'API
                List<CalllAPIVehicule.VehiculeData> listeVehicules = apiCaller.fetchVehiculesEnRoute();

                for (CalllAPIVehicule.VehiculeData v : listeVehicules) {
                    // 2. Si le véhicule n'est PAS déjà en train de rouler
                    if (!vehiculesEnCours.contains(v.idVehicule)) {
                        
                        vehiculesEnCours.add(v.idVehicule); // On le marque comme "occupé"

                        new Thread(() -> {
                            try {
                                System.out.println("\n>>> NOUVEAU VÉHICULE DÉTECTÉ : " + v.idVehicule);
                                
                                simulerTrajet(v, emetteur);
                                action.gererIntervention(v, emetteur);
                                cloture.cloturerIntervention(v);
                                
                            } finally {
                                // 3. UNE FOIS FINI : On le retire du registre
                                // pour qu'il puisse repartir sur une autre mission plus tard
                                vehiculesEnCours.remove(v.idVehicule);
                                System.out.println(">>> Véhicule " + v.idVehicule + " a terminé sa mission.");
                            }
                        }).start();
                    }
                }

                // 4. On attend 5 ou 10 secondes avant de redemander à l'API
                Thread.sleep(5000);

            } catch (Exception e) {
                System.err.println("Erreur dans la boucle de surveillance : " + e.getMessage());
            }
        }
    }

    private static void simulerTrajet(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur)
    {
        try {

            // Coordonnées fixes de la destination (ex: Gare Part-Dieu)
            //double DEST_LAT_FIXE = 45.765646;
            //double DEST_LON_FIXE = 4.865712;

            // Utilisation des coordonnées dynamiques de l'API
            String url = String.format(Locale.US,"http://localhost:5000/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",v.vehiculeLon, v.vehiculeLat, v.evenementLon, v.evenementLat);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.body());
            JsonNode coordinates = root.path("routes").get(0).path("geometry").path("coordinates");

            if (coordinates.isMissingNode()) return;

            //int monEau = 85;
            //String resources = "eau=80";
            String NomEquipement = v.getNomEquipement();
            Integer contenance = v.getContenanceCourante();

            for (int i = 0; i < coordinates.size() - 1; i++) {
                double lon1 = coordinates.get(i).get(0).asDouble();
                double lat1 = coordinates.get(i).get(1).asDouble();
                double lon2 = coordinates.get(i + 1).get(0).asDouble();
                double lat2 = coordinates.get(i + 1).get(1).asDouble();

                double distSegment = haversine(lat1, lon1, lat2, lon2);
                int nbPas = (int) (distSegment / DISTANCE_PAR_PAS);
                if (nbPas < 1) nbPas = 1;

                for (int j = 0; j <= nbPas; j++)
                {
                    double fraction = (double) j / nbPas;
                    double currentLat = lat1 + (lat2 - lat1) * fraction;
                    double currentLon = lon1 + (lon2 - lon1) * fraction;

                    // ENVOI MICRO:BIT
                    //System.out.printf(Locale.US, "ID: %s | Lat %.6f | Lon %.6f | Equipement: %s | Ressource: %d%n\n" , v.plaqueImmat, currentLat, currentLon, NomEquipement, contenance);

                    System.out.printf(Locale.US, "ID:%s;Geo:%.5f,%.5f;Res:%s;Time:%s;\n", v.plaqueImmat, currentLat, currentLon, NomEquipement + "=" + contenance, System.currentTimeMillis() / 1000);
                    emetteur.envoyerDonnees(v.plaqueImmat, currentLat, currentLon, NomEquipement, contenance);
                    Thread.sleep(RAFRAICHISSEMENT_MS);
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur trajet " + v.idVehicule + " : " + e.getMessage());
        }
    }
    
    private static double haversine(double lat1, double lon1, double lat2, double lon2)
    {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}