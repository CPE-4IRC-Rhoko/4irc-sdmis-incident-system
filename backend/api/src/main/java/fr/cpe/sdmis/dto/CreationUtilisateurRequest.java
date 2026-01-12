package fr.cpe.sdmis.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreationUtilisateurRequest(
        @NotBlank @Size(max = 50) String username,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Size(max = 50) String firstname,
        @NotBlank @Size(max = 50) String lastname,
        @NotBlank @Size(max = 50) String groupKeycloak,
        @NotNull UUID idCaserne,
        @NotNull UUID idRoleAgent,
        @NotNull UUID idStatutAgent,
        @NotNull UUID idVehicule,
        @NotBlank @Size(max = 50) String nomAgent,
        @NotBlank @Size(max = 50) String prenomAgent
) {
}
