package org.example.moteurdecision.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.moteurdecision.messaging.EventMessage;
import org.example.moteurdecision.messaging.InterventionMessage;
import org.example.moteurdecision.service.client.VehiculeApiClient;

import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import java.util.UUID;

public class DecisionService {
    private final VehiculeApiClient vehiculeApiClient;

    public DecisionService(String apiBaseUrl, ObjectMapper objectMapper) {
        this.vehiculeApiClient = new VehiculeApiClient(apiBaseUrl, objectMapper);
    }

    public List<InterventionMessage> creerInterventions(EventMessage eventMessage) {
        List<InterventionMessage> interventions = new ArrayList<>();
        var vehiculesSelectionnes = getVehiculesSelectionnes(eventMessage.getIdEvenement());
        if (vehiculesSelectionnes.isEmpty()) {
            InterventionMessage intervention = new InterventionMessage();
            intervention.setIdEvenement(eventMessage.getIdEvenement());
            intervention.setDateCreation(Instant.now());
            intervention.setVehiculeId(null);
            intervention.setSucces(false);
            intervention.setMessage("Aucune intervention créée");
            intervention.setCauseEchec("Aucun véhicule sélectionné pour l'évènement " + eventMessage.getIdEvenement());
            interventions.add(intervention);
            return interventions;
        }

        for (UUID vehiculeId : vehiculesSelectionnes) {
            InterventionMessage intervention = new InterventionMessage();
            intervention.setIdEvenement(eventMessage.getIdEvenement());
            intervention.setDateCreation(Instant.now());
            intervention.setVehiculeId(vehiculeId);
            intervention.setSucces(true);
            intervention.setMessage("Intervention créée pour l'évènement " + eventMessage.getIdEvenement());
            intervention.setCauseEchec(null);
            interventions.add(intervention);
        }
        return interventions;
    }

    private List<UUID> getVehiculesSelectionnes(UUID eventId) {
        try {
            return vehiculeApiClient.recupererVehiculesSelectionnes(eventId);
        } catch (Exception e) {
            System.err.println("Impossible de récupérer les véhicules sélectionnés : " + e.getMessage());
            return List.of();
        }
    }
}
