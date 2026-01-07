package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EvenementCreateRequest(
        @NotBlank String description,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotBlank String nomTypeEvenement,
        @NotBlank String nomSeverite
) { }
