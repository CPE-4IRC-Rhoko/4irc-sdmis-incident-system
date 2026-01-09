package org.example;

import java.util.Locale;
import java.util.Random;

public class DebutIntervention {

    private static final int MISE_A_JOUR_MS = 500; // 1 seconde entre chaque envoi

    public void gererIntervention(CalllAPIVehicule.VehiculeData v, MicrobitSender emetteur) {
        try {
            Random random = new Random();

            // 1. Calcul du temps d'intervention (0 à 120 secondes)
            int dureeSecondes = random.nextInt(121); 
            
            // 2. Calcul de la consommation (ex: part d'un niveau actuel et consomme entre 10 et 40)
            int niveauEauInitial = 100; 
            int consommationTotale = random.nextInt(31) + 10; // Entre 10 et 40 d'eau consommée
            int niveauEauFinal = Math.max(0, niveauEauInitial - consommationTotale);

            System.out.println("\n>>> DÉBUT DE L'INTERVENTION [" + v.plaqueImmat + "]");
            System.out.println("Durée prévue : " + dureeSecondes + "s | Consommation prévue : " + consommationTotale + "%");

            // 3. Boucle d'attente active
            for (int i = 0; i <= dureeSecondes; i++) {
                
                // Calcul de l'eau en temps réel (dégressif)
                double progression = (dureeSecondes == 0) ? 1 : (double) i / dureeSecondes;
                int eauActuelle = (int) (niveauEauInitial - (progression * (niveauEauInitial - niveauEauFinal)));

                // Envoi à la Micro:bit (Position fixe car le véhicule est arrêté)
                //String ressources = "eau=" + eauActuelle;
                emetteur.envoyerDonnees(v.plaqueImmat, v.evenementLat, v.evenementLon, /*ressources*/);

                // Affichage console
                System.out.printf(Locale.US, "[ACTION] %s - Eau: %d%% | Temps restant: %ds%n", 
                                  v.plaqueImmat, eauActuelle, (dureeSecondes - i));

                Thread.sleep(MISE_A_JOUR_MS);
            }

            System.out.println(">>> FIN DE L'INTERVENTION SUR PLACE\n");

        } catch (InterruptedException e) {
            System.err.println("Intervention interrompue : " + e.getMessage());
            Thread.currentThread().interrupt();
        }
    }
}