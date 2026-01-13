# SDMIS API (Java / Spring Boot)

API REST pour la gestion des évènements, interventions, véhicules, référentiels et utilisateurs/agents. Authentification via Keycloak (JWT) et échanges asynchrones avec le moteur de décision via RabbitMQ.

## Démarrage rapide
```bash
docker compose -f docker-compose.yaml.local up --build   # usage local
# ou
docker compose -f docker-compose.yaml up -d              # usage VPS
```

## Prérequis
- Java 17 (pour un build local `mvn -q -DskipTests package`)
- PostgreSQL (configurée via variables d’environnement)
- RabbitMQ (queues `decision.events` et `decision.interventions`)
- Keycloak (realm SDMIS, clients swagger/api & admin_api)

## Variables d’environnement (exemples)
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- `KEYCLOAK_ISSUER_URI`, `KEYCLOAK_JWKS_URI`
- `KEYCLOAK_CLIENT_ID_SWAGGER`, `KEYCLOAK_CLIENT_SECRET_SWAGGER`
- `KEYCLOAK_ADMIN_BASE_URL`, `KEYCLOAK_ADMIN_TOKEN_URL`, `KEYCLOAK_ADMIN_REALM`, `KEYCLOAK_ADMIN_CLIENT_ID`, `KEYCLOAK_ADMIN_CLIENT_SECRET`
- RabbitMQ : `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `DECISION_EVENT_QUEUE`, `DECISION_INTERVENTION_QUEUE`

## Sécurité
- Resource Server JWT (Keycloak). Rôles agrégés depuis `realm_access` et `resource_access` (préfixe `ROLE_`).
- CSRF actif mais ignoré pour `/api/**` et `/sdmis/**` (endpoints stateless). Swagger/health ouverts.
- Rôles principaux : `API_Admin`, `API_Operateur`, `API_Simulation`, `API_Terrain`, `API_Passerelle`, `API_Moteur_Decision`. Appliqués via `@PreAuthorize`.

## Fonctionnement métier (résumé)
- Validation intervention : interventions en “En cours”, véhicules “En route”, annulation des “En attente”, évènement “En intervention”, diffusion SSE.
- Clôture intervention : intervention “Terminée”, véhicule “Disponible”, évènement “Résolu” si plus d’interventions en cours, diffusion SSE.
- SSE : `/sdmis/sse` + routes snapshots initiales (`/api/vehicules/snapshots`, `/api/interventions/snapshots`, `/api/evenements/snapshots`).
- Création utilisateur/agent : `/api/admin/utilisateur/create` (ROLE_API_Admin) → crée l’utilisateur Keycloak (groupe, mot de passe temporaire) + insère l’agent en DB.

## Documentation
- Swagger UI : `/swagger-ui/index.html` (auth Keycloak).
- OpenAPI : `/v3/api-docs`.

## Build local
```bash
cd backend/api
mvn -q -DskipTests package
```

## Notes
- JDBC via `NamedParameterJdbcTemplate` (pas de JPA) pour respecter le schéma SQL existant.
- RabbitMQ transporte les messages JSON entre API et moteur (pas de HTTP direct).
