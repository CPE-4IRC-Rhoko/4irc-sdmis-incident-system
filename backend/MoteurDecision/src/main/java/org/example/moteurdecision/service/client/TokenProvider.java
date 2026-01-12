package org.example.moteurdecision.service.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;

/**
 * Fournit un jeton d'accès OAuth2 (client credentials) pour le moteur de décision.
 */
public class TokenProvider {
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String tokenUrl;
    private final String clientId;
    private final String clientSecret;

    private volatile String cachedToken;
    private volatile Instant expiresAt;

    public TokenProvider(String tokenUrl, String clientId, String clientSecret, ObjectMapper objectMapper) {
        this.tokenUrl = tokenUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public synchronized String getAccessToken() throws Exception {
        if (cachedToken != null && expiresAt != null && Instant.now().isBefore(expiresAt.minusSeconds(30))) {
            return cachedToken;
        }
        String body = "grant_type=client_credentials"
                + "&client_id=" + encode(clientId)
                + "&client_secret=" + encode(clientSecret);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(tokenUrl))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String bodyError = response.body();
            throw new IllegalStateException("Echec récupération token (" + response.statusCode() + ") : " + bodyError);
        }
        JsonNode root = objectMapper.readTree(response.body());
        cachedToken = root.get("access_token").asText();
        long expiresIn = root.has("expires_in") ? root.get("expires_in").asLong() : 300;
        expiresAt = Instant.now().plusSeconds(expiresIn);
        return cachedToken;
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
