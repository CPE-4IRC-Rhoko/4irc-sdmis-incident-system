package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record VehiculeCreateRequest(
        @NotBlank @Size(max = 16) String plaqueImmat,
        @NotBlank @Size(max = 16) String cleIdent,
        @NotNull UUID idCaserne,
        @NotNull List<UUID> equipements
) { }
