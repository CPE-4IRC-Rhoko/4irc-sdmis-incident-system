package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record VehiculeCreateRequest(
        @NotBlank @Size(max = 7) @Pattern(regexp = "^[A-Z0-9]{1,7}$") String plaqueImmat,
        @NotBlank @Size(max = 16) String cleIdent,
        @NotNull UUID idCaserne,
        @NotNull @Size(max = 10) List<UUID> equipements
) { }
