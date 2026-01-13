# SDMIS - Moteur de décision

Service Java/Spring Boot qui consomme les événements via RabbitMQ, sélectionne des véhicules en appelant l’API, et publie des interventions en retour.

## Flux global
1. Reçoit un `EventMessage` sur la queue `decision.events`.
2. Appelle l’API `/api/evenements/{id}/vehicules-selectionnes` (token Keycloak en client_credentials).
3. Construit une intervention (statut “En attente”) pour chaque véhicule sélectionné.
4. Publie un `InterventionMessage` sur la queue `decision.interventions`.

## Prérequis
- RabbitMQ (host/port/user/pass, vhost `/`).
- API SDMIS accessible (URL interne Docker ou externe).
- Keycloak : client service account `sdmis-moteur-decision` (client_credentials).
- Java 23 JRE dans l’image.

## Variables d’environnement
- `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `DECISION_EVENT_QUEUE`, `DECISION_INTERVENTION_QUEUE`
- `SDMIS_API_URL`
- `KEYCLOAK_TOKEN_URL`
- `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`

