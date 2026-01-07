package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record VehiculeUpdateRequest(
        @NotNull String plaqueImmat,
        @NotNull Double lat,
        @NotNull Double lon,
        OffsetDateTime timestamp,
        Map<String, Integer> ressources,
        Integer btn
) { }
