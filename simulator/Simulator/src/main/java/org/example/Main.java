package org.example;

import java.util.Arrays;
import java.util.List;
import java.util.Random;

public class Main {
    public static void main(String[] args) {

        // Création d'une instance Random pour sélectionner un type aléatoire
        List<String> typesIncidents = Arrays.asList(
                "Accident de voiture",
                "Blessure sportive",
                "Chute accidentelle",
                "Incendie domestique",
                "Malaises médicaux"
        );
        Random random = new Random();
        // Choisir un type d'incident aléatoire dans la liste
        String typeDeLIncident = typesIncidents.get(random.nextInt(typesIncidents.size()));

        try {
            Incident incident = new Incident(typeDeLIncident, 5, 48.8566, 2.3522, "F");
            System.out.println(incident);
        } catch (IllegalArgumentException e) {
            System.err.println("Erreur : " + e.getMessage());
        }
    }
}
