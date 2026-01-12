package fr.cpe.sdmis.service;

import fr.cpe.sdmis.dto.CreationUtilisateurRequest;
import fr.cpe.sdmis.dto.CreationUtilisateurResponse;
import fr.cpe.sdmis.repository.AgentRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

@Service
public class UtilisateurAdminService {

    private final KeycloakAdminClient keycloakAdminClient;
    private final AgentRepository agentRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public UtilisateurAdminService(KeycloakAdminClient keycloakAdminClient,
                                   AgentRepository agentRepository) {
        this.keycloakAdminClient = keycloakAdminClient;
        this.agentRepository = agentRepository;
    }

    public CreationUtilisateurResponse creerUtilisateur(CreationUtilisateurRequest request) {
        String tempPassword = genererPasswordTemporaire();
        String keycloakUserId = keycloakAdminClient.createUser(request, tempPassword);
        UUID userUuid = UUID.fromString(keycloakUserId);

        // Insérer l'agent en base avec l'id Keycloak
        agentRepository.insertAgent(
                userUuid,
                request.idVehicule(),
                request.idCaserne(),
                request.idRoleAgent(),
                request.idStatutAgent(),
                request.nomAgent(),
                request.prenomAgent()
        );

        return new CreationUtilisateurResponse(userUuid, tempPassword);
    }

    private String genererPasswordTemporaire() {
        byte[] bytes = new byte[12];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
