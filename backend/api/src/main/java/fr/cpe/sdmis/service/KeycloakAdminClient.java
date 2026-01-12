package fr.cpe.sdmis.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.cpe.sdmis.dto.CreationUtilisateurRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class KeycloakAdminClient {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String adminBaseUrl;
    private final String tokenUrl;
    private final String realm;
    private final String clientId;
    private final String clientSecret;

    public KeycloakAdminClient(RestTemplate restTemplate,
                               ObjectMapper objectMapper,
                               KeycloakAdminProperties props) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.adminBaseUrl = props.baseUrl();
        this.tokenUrl = props.tokenUrl();
        this.realm = props.realm();
        this.clientId = props.clientId();
        this.clientSecret = props.clientSecret();
    }

    public String createUser(CreationUtilisateurRequest req, String temporaryPassword) {
        String token = getAdminToken();
        HttpHeaders headers = bearerHeaders(token);
        Map<String, Object> payload = Map.of(
                "username", req.username(),
                "email", req.email(),
                "firstName", req.firstname(),
                "lastName", req.lastname(),
                "enabled", true,
                "requiredActions", List.of("UPDATE_PASSWORD")
        );
        ResponseEntity<Void> response = restTemplate.exchange(
                URI.create(adminBaseUrl + "/users"),
                HttpMethod.POST,
                new HttpEntity<>(payload, headers),
                Void.class
        );
        if (response.getStatusCode().is2xxSuccessful()) {
            String userId = extractIdFromLocation(response.getHeaders().getLocation(), req.username(), token);
            setTemporaryPassword(userId, temporaryPassword, token);
            assignGroup(userId, req.groupKeycloak(), token);
            return userId;
        }
        throw new IllegalStateException("Echec création utilisateur Keycloak (HTTP " + response.getStatusCode() + ")");
    }

    private String getAdminToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<String> resp = restTemplate.exchange(
                tokenUrl,
                HttpMethod.POST,
                new HttpEntity<>(form, headers),
                String.class
        );
        System.out.println("Admin token call -> url=" + tokenUrl + ", clientId=" + clientId);
        System.out.println("Admin token response code=" + resp.getStatusCode() + ", body=" + resp.getBody());
        if (!resp.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Echec récupération token admin (HTTP " + resp.getStatusCode() + ")");
        }
        try {
            JsonNode root = objectMapper.readTree(resp.getBody());
            return root.get("access_token").asText();
        } catch (Exception e) {
            throw new IllegalStateException("Token admin illisible : " + e.getMessage(), e);
        }
    }

    private void assignGroup(String userId, String groupName, String token) {
        String groupId = findGroupId(groupName, token);
        restTemplate.exchange(
                adminBaseUrl + "/users/" + userId + "/groups/" + groupId,
                HttpMethod.PUT,
                new HttpEntity<>(bearerHeaders(token)),
                Void.class
        );
    }

    private String findGroupId(String groupName, String token) {
        // 1) Recherche directe (inclut éventuellement des sous-groupes si briefRepresentation=false)
        try {
            ResponseEntity<String> searchResp = restTemplate.exchange(
                    adminBaseUrl + "/groups?search=" + groupName + "&briefRepresentation=false",
                    HttpMethod.GET,
                    new HttpEntity<>(bearerHeaders(token)),
                    String.class
            );
            JsonNode arr = objectMapper.readTree(searchResp.getBody());
            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    String found = findGroupIdRecursive(node, groupName);
                    if (found != null) {
                        return found;
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Recherche groupe échouée : " + e.getMessage(), e);
        }

        // 2) Fallback : liste racine + sous-groupes (briefRepresentation=false pour récupérer subGroups)
        try {
            ResponseEntity<String> resp = restTemplate.exchange(
                    adminBaseUrl + "/groups?briefRepresentation=false",
                    HttpMethod.GET,
                    new HttpEntity<>(bearerHeaders(token)),
                    String.class
            );
            JsonNode roots = objectMapper.readTree(resp.getBody());
            if (roots.isArray()) {
                for (JsonNode node : roots) {
                    String id = findGroupIdRecursive(node, groupName);
                    if (id != null) {
                        return id;
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Recherche groupe échouée : " + e.getMessage(), e);
        }

        throw new IllegalStateException("Groupe Keycloak introuvable : " + groupName);
    }

    private String findGroupIdRecursive(JsonNode node, String targetName) {
        if (node.hasNonNull("name") && targetName.equals(node.get("name").asText()) && node.hasNonNull("id")) {
            return node.get("id").asText();
        }
        if (node.has("subGroups") && node.get("subGroups").isArray()) {
            for (JsonNode child : node.get("subGroups")) {
                String found = findGroupIdRecursive(child, targetName);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private void setTemporaryPassword(String userId, String password, String token) {
        Map<String, Object> payload = Map.of(
                "type", "password",
                "temporary", true,
                "value", password
        );
        restTemplate.exchange(
                adminBaseUrl + "/users/" + userId + "/reset-password",
                HttpMethod.PUT,
                new HttpEntity<>(payload, bearerHeaders(token)),
                Void.class
        );
    }

    private String extractIdFromLocation(URI location, String username, String token) {
        if (location != null) {
            String path = location.getPath();
            int lastSlash = path.lastIndexOf('/');
            if (lastSlash >= 0 && lastSlash + 1 < path.length()) {
                return path.substring(lastSlash + 1);
            }
        }
        // fallback: recherche par username
        ResponseEntity<String> searchResp = restTemplate.exchange(
                adminBaseUrl + "/users?username=" + username,
                HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)),
                String.class
        );
        try {
            JsonNode arr = objectMapper.readTree(searchResp.getBody());
            if (arr.isArray() && arr.size() > 0) {
                return arr.get(0).get("id").asText();
            }
        } catch (Exception e) {
            System.out.println("Impossible de récupérer l'id utilisateur via la recherche : " + e.getMessage());
        }
        throw new IllegalStateException("Impossible de récupérer l'id Keycloak pour l'utilisateur " + username);
    }

    private HttpHeaders bearerHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    public record KeycloakAdminProperties(
            String baseUrl,
            String tokenUrl,
            String realm,
            String clientId,
            String clientSecret
    ) { }
}
