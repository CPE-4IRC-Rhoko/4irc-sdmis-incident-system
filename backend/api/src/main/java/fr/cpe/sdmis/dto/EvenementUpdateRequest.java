package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EvenementUpdateRequest(
        @NotBlank @Size(max = 255) String description,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotBlank String nomTypeEvenement,
        @NotBlank String nomSeverite
) {
}
