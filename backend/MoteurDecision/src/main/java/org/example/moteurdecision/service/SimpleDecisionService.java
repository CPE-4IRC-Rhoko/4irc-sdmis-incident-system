package org.example.moteurdecision.service;

import org.example.moteurdecision.messaging.EventMessage;
import org.example.moteurdecision.messaging.InterventionMessage;

import java.time.Instant;

/**
 * Implémentation volontairement simple : choisit le premier véhicule disponible.
 */
public class SimpleDecisionService {

    public InterventionMessage creerIntervention(EventMessage eventMessage) {
        InterventionMessage intervention = new InterventionMessage();
        intervention.setIdEvenement(eventMessage.getIdEvenement());
        int vehicule = eventMessage.getVehiculesDisponibles().isEmpty()
                ? -1
                : eventMessage.getVehiculesDisponibles().get(0);
        intervention.setVehiculeId(vehicule);
        intervention.setMessage("Intervention créée pour l'évènement " + eventMessage.getIdEvenement());
        intervention.setDateCreation(Instant.now());
        return intervention;
    }
}
