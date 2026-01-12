package fr.cpe.sdmis.config;

import fr.cpe.sdmis.service.KeycloakAdminClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakAdminConfig {

    @Bean
    public KeycloakAdminClient.KeycloakAdminProperties keycloakAdminProperties(
            @Value("${keycloak.admin.base-url}") String baseUrl,
            @Value("${keycloak.admin.token-url}") String tokenUrl,
            @Value("${keycloak.admin.realm}") String realm,
            @Value("${keycloak.admin.client-id}") String clientId,
            @Value("${keycloak.admin.client-secret}") String clientSecret
    ) {
        return new KeycloakAdminClient.KeycloakAdminProperties(baseUrl, tokenUrl, realm, clientId, clientSecret);
    }
}
