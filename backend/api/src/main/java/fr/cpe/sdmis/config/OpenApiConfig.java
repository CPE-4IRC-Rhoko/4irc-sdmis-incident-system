package fr.cpe.sdmis.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.OAuthFlow;
import io.swagger.v3.oas.models.security.OAuthFlows;
import io.swagger.v3.oas.models.security.Scopes;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        String authorizationUrl = "https://auth.4irc.hugorodrigues.fr/realms/SDMIS/protocol/openid-connect/auth";
        String tokenUrl = "https://auth.4irc.hugorodrigues.fr/realms/SDMIS/protocol/openid-connect/token";

        SecurityScheme keycloakScheme = new SecurityScheme()
                .type(SecurityScheme.Type.OAUTH2)
                .flows(new OAuthFlows().authorizationCode(
                        new OAuthFlow()
                                .authorizationUrl(authorizationUrl)
                                .tokenUrl(tokenUrl)
                                .scopes(new Scopes()
                                        .addString("openid", "OpenID scope")
                                        .addString("profile", "Profile")
                                        .addString("email", "Email")
                                        .addString("roles", "Roles"))
                ));

        return new OpenAPI()
                .components(new Components().addSecuritySchemes("keycloak", keycloakScheme))
                .addSecurityItem(new SecurityRequirement().addList("keycloak"));
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
