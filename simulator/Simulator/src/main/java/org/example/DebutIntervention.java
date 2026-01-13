package org.example;

import java.util.Locale;
import java.util.Random;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

public class DebutIntervention {

    private static final int MISE_A_JOUR_MS = 500; 
    private static final String API_URL = "https://api.4irc.hugorodrigues.fr/api/vehicules/statut/en-intervention";
    
    // On instancie le service qui vérifie les interventions terminées
    private final CallAPIevenementFINI checkFini = new CallAPIevenementFINI();

    public void gererIntervention(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur, String token) {
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
                    .header("Authorization", "Bearer " + token)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();
            
            client.send(request, HttpResponse.BodyHandlers.ofString());

            // --- 2. LOGIQUE DE SIMULATION ---
            Random random = new Random();
            int dureeSecondes = random.nextInt(301); 
            String nomEquipement = (v.getNomEquipement() != null) ? v.getNomEquipement() : "Inconnu";
            int contenanceInitiale = (v.getContenanceCourante() != null) ? v.getContenanceCourante() : 0;
            
            double pourcentageConso = (random.nextInt(31) + 10) / 100.0;
            int niveauEauFinal = (int) (contenanceInitiale - (contenanceInitiale * pourcentageConso));

            System.out.println("\n>>> INTERVENTION EN COURS [" + v.plaqueImmat + "]");

            // --- 3. BOUCLE D'ATTENTE AVEC VÉRIFICATION API ---
            for (int i = 0; i <= dureeSecondes; i++) {
                
                // --- TOUTES LES 4 ITÉRATIONS (environ 2 secondes), ON VÉRIFIE SI L'EVENT EST FINI ---
                if (i % 3 == 0) 
                    {
                        List<CallAPIevenementFINI.InterventionTerminee> terminees = checkFini.fetchInterventionsTerminees(token);
                        boolean estFini = terminees.stream().anyMatch(t -> t.idEvenement.equals(v.idEvenement) && t.idVehicule.equals(v.idVehicule)
                    );
                    if (estFini) {
                        System.out.println("INTERRUPTION : L'événement " + v.idEvenement + " a été marqué comme FINI dans l'API. Arrêt de la simulation.");
                        break; // On sort de la boucle for immédiatement
                    }
                }

                // Calcul de la décrétion de l'eau
                double progression = (dureeSecondes == 0) ? 1 : (double) i / dureeSecondes;
                int valeurActuelle = (int) (contenanceInitiale - (progression * (contenanceInitiale - niveauEauFinal)));

                emetteur.envoyerDonnees(v.plaqueImmat, v.evenementLat, v.evenementLon, nomEquipement, valeurActuelle);
                
                if (i % 10 == 0) { // Log console moins fréquent
                    System.out.printf(Locale.US, "[ACTION] %s - %d L | Temps max restant: %ds%n", v.plaqueImmat, valeurActuelle, (dureeSecondes - i));
                }
                
                Thread.sleep(MISE_A_JOUR_MS);
            }

            System.out.println(">>> FIN DE L'ACTION SUR PLACE POUR " + v.plaqueImmat + "\n");

        } catch (Exception e) {
            System.err.println("Erreur durant l'intervention : " + e.getMessage());
        }
    }
}