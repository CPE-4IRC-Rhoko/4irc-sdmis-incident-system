package org.example;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class VehiculeGPS {

    private static final double VITESSE_KMH = 200.0;
    private static final int RAFRAICHISSEMENT_MS = 100;
    private static final double DISTANCE_PAR_PAS = (VITESSE_KMH / 3.6) * (RAFRAICHISSEMENT_MS / 1000.0);

    public static void main(String[] args)
    {
        AuthService authService = new AuthService();
        CalllAPIVehicule apiCaller = new CalllAPIVehicule();
        MicrobitSender emetteur = new MicrobitSender("COM3");
        try { Thread.sleep(2000); } catch (Exception e) {}

        DebutIntervention action = new DebutIntervention();
        FinIntervention cloture = new FinIntervention();
        Trajet trajetSimu = new Trajet();
        CallAPICaserne caserneService = new CallAPICaserne();

        // Registre pour ne pas lancer deux fois le même véhicule
        Set<String> vehiculesEnCours = Collections.synchronizedSet(new HashSet<>());

        System.out.println(">>> Surveillance des incidents démarrée...");

        while (true) { // Boucle infinie
            try
            {
                String token = authService.getAccessToken(); // On récupère le token ici

                // 1. On récupère la liste actuelle des véhicules en route depuis l'API
                List<CalllAPIVehicule.VehiculeData> listeVehicules = apiCaller.fetchVehiculesEnRoute(token);
                // (Pour chaque véhicule retourné par l'API....)
                for (CalllAPIVehicule.VehiculeData v : listeVehicules)
                {
                    // 2. Si le véhicule n'est PAS déjà en train de rouler
                    if (!vehiculesEnCours.contains(v.idVehicule))
                    {
                        vehiculesEnCours.add(v.idVehicule); // On le marque comme "occupé"
                        new Thread(() -> {
                            try {
                                System.out.println("\n>>> NOUVEAU VÉHICULE DÉTECTÉ : " + v.plaqueImmat);
                                trajetSimu.executer(v, emetteur);
                                action.gererIntervention(v, emetteur, token);
                                cloture.cloturerIntervention(v, token);
                                CallAPICaserne.CaserneData caserne = caserneService.recupererCaserne(v, token);
                                if (caserne != null) {
                                    trajetSimu.executerRetourCaserne(v, caserne, emetteur);
                                }
                                
                            } finally {
                                // 3. UNE FOIS FINI : On le retire du registre pour qu'il puisse repartir sur une autre mission plus tard
                                vehiculesEnCours.remove(v.idVehicule);
                                System.out.println(">>> Véhicule " + v.idVehicule + " a terminé sa mission.");
                            }
                        }).start();
                    }
                }
                // 4. On attend 10 secondes avant de redemander à l'API
                Thread.sleep(10000);

            } catch (Exception e) {
                System.err.println("Erreur dans la boucle de surveillance : " + e.getMessage());
            }
        }
    }
}