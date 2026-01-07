package fr.cpe.sdmis.dto;

import java.util.UUID;

public record VehiculeOperationnelResponse(
        UUID id,
        double latitude,
        double longitude,
        UUID idStatut,
        String nomStatut,
        boolean operationnel
) { }
