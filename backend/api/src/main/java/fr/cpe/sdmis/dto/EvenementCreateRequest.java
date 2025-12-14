package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record EvenementCreateRequest(
        @NotBlank String description,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull UUID idTypeEvenement,
        @NotNull UUID idStatut,
        @NotNull UUID idSeverite
) { }
