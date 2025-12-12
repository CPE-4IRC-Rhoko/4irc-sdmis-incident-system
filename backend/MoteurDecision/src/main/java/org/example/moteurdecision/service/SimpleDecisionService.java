package org.example.moteurdecision.service;

import org.example.moteurdecision.domain.Vehicule;
import org.example.moteurdecision.domain.status.StatutVehicule;
import org.example.moteurdecision.messaging.EventMessage;
import org.example.moteurdecision.messaging.InterventionMessage;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Implémentation volontairement simple : choisit le premier véhicule disponible
 * et indique l'échec si aucune intervention cohérente ne peut être créée.
 */
public class SimpleDecisionService {
    public SimpleDecisionService() {
    }
    public InterventionMessage creerIntervention(EventMessage eventMessage) {
        InterventionMessage intervention = new InterventionMessage();
        intervention.setIdEvenement(eventMessage.getIdEvenement());
        intervention.setDateCreation(Instant.now());

        var vehiculesDisponibles = getVehiculesDisponibles();
        if (vehiculesDisponibles.isEmpty()) {
            intervention.setVehiculeId(-1);
            intervention.setSucces(false);
            intervention.setMessage("Aucune intervention créée");
            intervention.setCauseEchec("Aucun véhicule disponible pour l'évènement " + eventMessage.getIdEvenement());
            return intervention;
        }

        int vehiculeId = vehiculesDisponibles.getFirst().getId();
        intervention.setVehiculeId(vehiculeId);
        intervention.setSucces(true);
        intervention.setMessage("Intervention créée pour l'évènement " + eventMessage.getIdEvenement());
        intervention.setCauseEchec(null);
        return intervention;
    }

    private List<Vehicule> getVehiculesDisponibles() {
        List<Vehicule> vehiculesDisponibles = new ArrayList<>();
        vehiculesDisponibles.add(new Vehicule(100, 45.000, 45.000, new StatutVehicule(1, "statut_test", true)));
        vehiculesDisponibles.add(new Vehicule(101, 45.000, 45.000, new StatutVehicule(1, "statut_test_2", true)));

        return  vehiculesDisponibles;
    }
}
