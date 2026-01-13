package org.example;

import java.io.IOException;
import java.util.List;

public class Incident {

    public static void main(String[] args) {
        
      // Initialisation des outils dont on a besoin (voir les classes dédiées)
        CallAPI callAPI = new CallAPI();
        SendAPI sendAPI = new SendAPI();
        AuthService authService = new AuthService();

        while (true) {
            long debutCycle = System.currentTimeMillis();
            String token = authService.getAccessToken(); // token keycloak

            try {
                System.out.println("\n--- Nouveau cycle de création d'incident ---");

                // 1. Récupération des types d'événements
                List<TypeEvenement> evenements = callAPI.recupererEvenements(token);
                if (evenements != null && !evenements.isEmpty())
                  {
                    // 2. Sélection aléatoire
                    TypeEvenement evenementAleatoire = callAPI.selectionnerEvenementAleatoire(evenements);
                    // 3. Envoi de l'événement (GPS aléatoire inclus dans envoyerEvenement)
                    sendAPI.envoyerEvenement(evenementAleatoire, token);
                  }
            } catch (IOException e) {
                System.err.println("Erreur de connexion à l'API : " + e.getMessage());
            } catch (InterruptedException e) {
                System.err.println("Processus interrompu.");
                Thread.currentThread().interrupt(); // Bonne pratique
                break; // On sort de la boucle si on interrompt le programme
            }

            // --- GESTION DU TEMPS (1 MINUTE) ---
            attendreProchainCycle(debutCycle, 60000); // 60 000 ms = 1 min
        }
    }

    /**
     * Calcule le temps restant pour atteindre la durée du cycle 
     * et met le programme en pause.
     */
    private static void attendreProchainCycle(long start, long dureeCycleMs) {
        long tempsEcoule = System.currentTimeMillis() - start;
        long tempsRestant = dureeCycleMs - tempsEcoule;

        if (tempsRestant > 0) {
            try {
                Thread.sleep(tempsRestant);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        } 
    }
}