package org.example;

import java.util.Locale;
import java.util.Random;
import java.util.HashMap;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

public class DebutIntervention {

    private static final int MISE_A_JOUR_MS = 500; 
    private static final String API_URL = "http://localhost:8082/api/vehicules/statut/en-intervention";

    public void gererIntervention(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur) {
        ObjectMapper mapper = new ObjectMapper();
        HttpClient client = HttpClient.newHttpClient();

        try {
            // --- 1. SIGNALER LE DÉBUT À L'API ---
            Map<String, String> data = new HashMap<>();
            data.put("idVehicule", v.idVehicule);
            String jsonBody = mapper.writeValueAsString(data);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();
            
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 204) {
                System.out.println("Statut mis à jour : " + v.idVehicule + " est maintenant EN INTERVENTION.");
            } else {
                System.err.println("Erreur Statut API (" + response.statusCode() + ") : " + response.body());
            }

            // --- 2. LOGIQUE DE SIMULATION ---
            Random random = new Random();
            int dureeSecondes = random.nextInt(121); // 0 à 120s

            String nomEquipement = v.getNomEquipement();
            int contenanceInitiale = v.getContenanceCourante();
            
            // Calcul de la consommation finale (ex: consomme entre 10% et 40% de la capacité actuelle)
            double pourcentageConso = (random.nextInt(31) + 10) / 100.0; 
            int niveauEauFinal = (int) (contenanceInitiale - (contenanceInitiale * pourcentageConso));

            System.out.println("\n>>> DÉBUT DE L'INTERVENTION SUR PLACE [" + v.plaqueImmat + "]");
            System.out.printf("Équipement : %s | Durée : %ds | Cible finale : %d%n", nomEquipement, dureeSecondes, niveauEauFinal);

            // 3. Boucle d'attente active
            for (int i = 0; i <= dureeSecondes; i++) {
                double progression = (dureeSecondes == 0) ? 1 : (double) i / dureeSecondes;
                int valeurActuelle = (int) (contenanceInitiale - (progression * (contenanceInitiale - niveauEauFinal)));

                // Envoi à la Micro:bit
                emetteur.envoyerDonnees(v.plaqueImmat, v.evenementLat, v.evenementLon, nomEquipement, valeurActuelle);
                
                System.out.printf(Locale.US, "[ACTION] %s - %s: %d | Temps restant: %ds%n", 
                        v.plaqueImmat, nomEquipement, valeurActuelle, (dureeSecondes - i));
                
                Thread.sleep(MISE_A_JOUR_MS);
            }

            System.out.println(">>> FIN DE L'INTERVENTION SUR PLACE POUR " + v.plaqueImmat + "\n");

        } catch (Exception e) {
            System.err.println("Erreur durant l'intervention de " + v.idVehicule + " : " + e.getMessage());
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        }
    }
}