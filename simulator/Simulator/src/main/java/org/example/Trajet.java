package org.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;
import java.util.Set;

public class Trajet 
{

    private static final double VITESSE_KMH = 200.0;
    private static final int RAFRAICHISSEMENT_MS = 100;
    private static final double DISTANCE_PAR_PAS = (VITESSE_KMH / 3.6) * (RAFRAICHISSEMENT_MS / 1000.0);
    
    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public void executer(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur)
    {
        try 
        {
            // Destination fixe (ou passée en paramètre si besoin)
            double DEST_LAT_FIXE = 45.765646;
            double DEST_LON_FIXE = 4.865712;

            String url = String.format(Locale.US,"http://localhost:5000/route/v1/driving/%f,%f;%f,%f?geometries=geojson&overview=full",v.vehiculeLon, v.vehiculeLat, DEST_LON_FIXE, DEST_LAT_FIXE);

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

    private double haversine(double lat1, double lon1, double lat2, double lon2)
    {
        final int R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
