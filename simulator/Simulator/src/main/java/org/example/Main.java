package org.example;

import java.io.IOException;
import java.util.List;
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
      Runnable threadVehicule = () ->
      {
         System.err.println("Thread Véhicule démarré.");
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