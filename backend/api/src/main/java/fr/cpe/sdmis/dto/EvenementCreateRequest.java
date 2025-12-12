package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record EvenementCreateRequest(
        @NotBlank String type,
        @Min(1) @Max(5) int severite,
        double lat,
        double lon
) { }
