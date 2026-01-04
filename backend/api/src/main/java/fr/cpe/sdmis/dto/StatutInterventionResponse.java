package fr.cpe.sdmis.dto;

import java.util.UUID;

public record StatutInterventionResponse(
        UUID id,
        String nom
) { }
