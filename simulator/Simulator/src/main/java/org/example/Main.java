package org.example;

import org.apache.logging.log4j.message.StringFormattedMessage;

import java.io.IOException;
import java.util.List;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class Main {

   public static void main(String[] args) {

      ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

      // 🔹 Thread 1 : Incidents
      Runnable threadIncident = () -> {
         try {
            // Appel de l'API pour récupérer les événements
            CallAPI callAPI = new CallAPI();
            List<TypeEvenement> evenements = callAPI.recupererEvenements();

            // Sélection d'un événement aléatoire
            TypeEvenement evenementAleatoire =
                    callAPI.selectionnerEvenementAleatoire(evenements);

            // Envoi de l'événement avec GPS
            SendAPI sendAPI = new SendAPI();
            sendAPI.envoyerEvenement(evenementAleatoire);

         } catch (IOException e) {
            System.err.println("Erreur IO : " + e.getMessage());
            e.printStackTrace();
         } catch (InterruptedException e) {
            System.err.println("Requête interrompue");
            e.printStackTrace();
         }
      };

      // 🔹 Thread 2 : Véhicule
      Runnable threadVehicule = () -> {

         // 1. Initialisation (à faire une seule fois au début)
         // Remplace "COM3" par le bon port de ta Micro:bit Terrain
         MicrobitSender emetteur = new MicrobitSender("COM3");

         // Attendre 2 secondes que le port soit prêt (recommandé)
         try { Thread.sleep(2000); } catch (Exception e) {}

         // Tes calculs actuels...
         String monId = "AA105AA";
         double maLat = 777; // Valeur calculée par ton simu
         double maLon = 777;  // Valeur calculée par ton simu
         int monEau = 85;

         // 2. Envoi des données
         emetteur.envoyerDonnees(monId, maLat, maLon, monEau);

         // IMPORTANT : Faire une petite pause si tu as plusieurs camions
         // pour ne pas saturer le tampon de réception de la Micro:bit
         try { Thread.sleep(50); } catch (Exception e) {}

         // 3. Fermeture à la fin
         emetteur.close();

      };

      // Création des threads
      Thread t1 = new Thread(threadIncident, "Thread-Incident");
      Thread t2 = new Thread(threadVehicule, "Thread-Vehicule");

      // ⏱ Planification
      scheduler.scheduleAtFixedRate(
              threadIncident, 0, 2, TimeUnit.MINUTES
      );

      scheduler.scheduleAtFixedRate(
              threadVehicule, 0, 30, TimeUnit.SECONDS
      );
   }
}