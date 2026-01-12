package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record VehiculeUpdateRequest(
        @NotBlank @Size(max = 7) @Pattern(regexp = "^[A-Z0-9]{1,7}$") String plaqueImmat,
        @NotNull Double lat,
        @NotNull Double lon,
        OffsetDateTime timestamp,
        @Size(max = 20) Map<String, Integer> ressources,
        Integer btn
) { }
