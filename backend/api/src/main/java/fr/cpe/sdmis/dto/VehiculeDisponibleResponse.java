package fr.cpe.sdmis.dto;

import java.util.UUID;

public record VehiculeDisponibleResponse(
        UUID id,
        double latitude,
        double longitude,
        UUID idStatut,
        String nomStatut,
        boolean operationnel
) { }
