package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ClotureInterventionRequest(
        @NotNull UUID id_evenement,
        @NotNull UUID id_vehicule
) { }
