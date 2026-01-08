package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ValidationInterventionRequest(
        @NotNull UUID id_evenement,
        @NotNull List<UUID> vehicules
) { }
