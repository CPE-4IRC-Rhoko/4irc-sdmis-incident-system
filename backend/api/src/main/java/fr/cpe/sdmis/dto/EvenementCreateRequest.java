package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EvenementCreateRequest(
        @NotBlank @Size(max = 255) String description,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotBlank @Size(max = 50) String nomTypeEvenement,
        @NotBlank @Size(max = 50) String nomSeverite
) { }
