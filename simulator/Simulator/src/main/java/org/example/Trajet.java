package org.example;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class Trajet 
{

    private static final double VITESSE_KMH = 200.0;
    private static final int RAFRAICHISSEMENT_MS = 300;
    private static final double DISTANCE_PAR_PAS = (VITESSE_KMH / 3.6) * (RAFRAICHISSEMENT_MS / 1000.0);
    
    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public void executer(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur)
    {
        try 
        {
            // Destination fixe (ou passée en paramètre si besoin)
            // double DEST_LAT_FIXE = 45.765646;
            // double DEST_LON_FIXE = 4.865712;
            // double DEPART_LAT =  45.765252;
            // double DEPART_LONG = 4.869508;

            String url = String.format(Locale.US,"https://api-osrm.4irc.hugorodrigues.fr/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",v.vehiculeLon, v.vehiculeLat, v.evenementLon, v.evenementLat);
            //String url = String.format(Locale.US,"https://api-osrm.4irc.hugorodrigues.fr/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",DEPART_LONG, DEPART_LAT, DEST_LON_FIXE, DEST_LAT_FIXE);
            
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode root = mapper.readTree(response.body());
            JsonNode coordinates = root.path("routes").get(0).path("geometry").path("coordinates");

            if (coordinates.isMissingNode()) return;

            String nomEquipement = v.getNomEquipement();
            Integer contenance = v.getContenanceCourante();

            for (int i = 0; i < coordinates.size() - 1; i++)
            {

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

                    System.out.printf(Locale.US, "ID:%s;Geo:%.5f,%.5f;Res:%s;Time:%s;\n", v.plaqueImmat, currentLat, currentLon, nomEquipement + "=" + contenance, System.currentTimeMillis() / 1000);

                    // ENVOIE DES POINT GPS AU MICRO:BIT
                    emetteur.envoyerDonnees(v.plaqueImmat, currentLat, currentLon, nomEquipement, contenance);
                    Thread.sleep(RAFRAICHISSEMENT_MS);
                }
            }
        } catch (Exception e)
        {
            System.err.println("Erreur trajet " + v.idVehicule + " : " + e.getMessage());
        }
    }

    public void executerRetourCaserne(CalllAPIVehicule.VehiculeData v, CallAPICaserne.CaserneData caserne, MicrobitSender emetteur) 
    {
        if (caserne == null) return;
        
        try {
            System.out.println("🔄 Début du trajet de retour vers : " + caserne.nom_de_la_caserne);
            
            // URL OSRM : Départ (Lieu incident) -> Arrivée (Caserne)
            String url = String.format(Locale.US,
                "https://api-osrm.4irc.hugorodrigues.fr/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",
                v.evenementLon, v.evenementLat, caserne.longitude, caserne.latitude);

            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            JsonNode root = mapper.readTree(response.body());
            JsonNode coordinates = root.path("routes").get(0).path("geometry").path("coordinates");

            if (coordinates.isMissingNode()) return;

            // On suit le trajet comme pour l'aller
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

                    // On envoie "RETOUR" ou une contenance à 0 car le véhicule a fini son action
                    emetteur.envoyerDonnees(v.plaqueImmat, currentLat, currentLon, "RETOUR", 0);
                    Thread.sleep(RAFRAICHISSEMENT_MS);
                }
            }
            System.out.println("🏁 Véhicule " + v.plaqueImmat + " est rentré à la caserne.");
        } catch (Exception e) {
            System.err.println("Erreur trajet retour " + v.idVehicule + " : " + e.getMessage());
        }
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2)
    {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
