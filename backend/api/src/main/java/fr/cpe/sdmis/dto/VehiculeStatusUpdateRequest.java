package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotNull;

public record VehiculeStatusUpdateRequest(
        @NotNull java.util.UUID idVehicule
) { }
