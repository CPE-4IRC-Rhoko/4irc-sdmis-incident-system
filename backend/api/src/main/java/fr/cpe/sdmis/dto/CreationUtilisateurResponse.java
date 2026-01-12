package fr.cpe.sdmis.dto;

import java.util.UUID;

public record CreationUtilisateurResponse(
        UUID keycloakUserId,
        String temporaryPassword
) {
}
