package org.example.moteurdecision.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.moteurdecision.domain.Vehicule;
import org.example.moteurdecision.messaging.EventMessage;
import org.example.moteurdecision.messaging.InterventionMessage;
import org.example.moteurdecision.service.client.VehiculeApiClient;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class DecisionService {
    private final VehiculeApiClient vehiculeApiClient;

    public DecisionService(String apiBaseUrl, ObjectMapper objectMapper) {
        this.vehiculeApiClient = new VehiculeApiClient(apiBaseUrl, objectMapper);
    }

    public InterventionMessage creerIntervention(EventMessage eventMessage) {
        InterventionMessage intervention = new InterventionMessage();
        intervention.setIdEvenement(eventMessage.getIdEvenement());
        intervention.setDateCreation(Instant.now());

        var vehiculesOperationnels = getVehiculesOperationnels();
        if (vehiculesOperationnels.isEmpty()) {
            intervention.setVehiculeId(null);
            intervention.setSucces(false);
            intervention.setMessage("Aucune intervention créée");
            intervention.setCauseEchec("Aucun véhicule operationnel pour l'évènement " + eventMessage.getIdEvenement());
            return intervention;
        }

        UUID vehiculeId = vehiculesOperationnels.getFirst().getId();
        intervention.setVehiculeId(vehiculeId);
        intervention.setSucces(true);
        intervention.setMessage("Intervention créée pour l'évènement " + eventMessage.getIdEvenement());
        intervention.setCauseEchec(null);
        return intervention;
    }

    private List<Vehicule> getVehiculesOperationnels() {
        try {
            return vehiculeApiClient.recupererVehiculesOperationnels();
        } catch (Exception e) {
            System.err.println("Impossible de récupérer les véhicules operationnels : " + e.getMessage());
            return List.of();
        }
    }
}
