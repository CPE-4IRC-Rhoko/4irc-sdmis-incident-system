package org.example;

import java.io.IOException;
import java.util.List;

public class Main {
   public static void main(String[] args) {

      try {
         //Appel de l'API pour récupérer les événements
         CallAPI callAPI = new CallAPI();
         List<TypeEvenement> evenements = callAPI.recupererEvenements();

         //Sélection d'un événement aléatoire
         TypeEvenement evenementAleatoire = callAPI.selectionnerEvenementAleatoire(evenements);

         //Envoi de l'événement avec GPS
         SendAPI sendAPI = new SendAPI();
         sendAPI.envoyerEvenement(evenementAleatoire);

      } catch (IOException e) {
         System.err.println("Erreur IO : " + e.getMessage());
         e.printStackTrace();
      } catch (InterruptedException e) {
         System.err.println("Requête interrompue");
         e.printStackTrace();
      }
   }
}
