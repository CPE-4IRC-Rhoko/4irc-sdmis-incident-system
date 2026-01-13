
# Système de gestion et suivi des incidents – SDMIS Lyon

## 1. Contexte

Ce projet est réalisé dans le cadre du module **4IRC – Projet Scientifique**.
Objectif : concevoir et développer un **système intégré** permettant le suivi en temps réel des incidents et interventions pour le SDMIS de Lyon/Villeurbanne, incluant :

- Une application QG / Terrain,
- Une simulation d’incidents et de véhicules,
- Une couche IoT (micro:bit),
- Une architecture sécurisée et industrialisée (DevOps, CI/CD, qualité, sécurité).
- Une base de données.
- un hébergement vps avec un nom de domaine.

## 2. Architecture globale

### 2.1. Composants principaux

- **App QG (backend Java)**
  - Récupération des données en temps réels avec flux SSE.
  - Expose des API REST sécurisées.
  - Implémente le moteur de décision (affectation automatique de ressources à un événement).
  - Lien entre API et moteur de décision avec RabbitMQ pour la communication.
  - Gère les incidents, interventions, véhicules et ressources en base de données.
  - Consomme les messages IoT / simulation.

## Même application QG et TERRAIN, accès réservé selon le rôle de l'utilisateur en fonction de keycloak
- **Front QG (web)**
  - Interface opérateur (carte interactive, liste d’incidents, interventions).
  - Authentification via Keycloak.
  - Consomme uniquement les APIs du backend.

- **Front TERRAIN (web)**
  - Interface pompier (carte interactive avec visualisation de son véhicule et trajet vers l'intervention qui lui a été affectée).
  - Authentification via Keycloak.
  - Consomme uniquement les APIs du backend.

- **Simulation**
  - Génère des incidents et véhicules simulés.
  - Fait évoluer leur état (position, gravité, etc.).
  - Envoie les événements vers l’App QG (REST).

- **IoT / micro:bit**
  - Micro:bit émetteur : représente les terminaux à bord des véhicules.
  - Micro:bit récepteur : connecté à un PC, qui joue le rôle de passerelle vers le datacenter.
  - Service `iot-gateway` : lit la liaison série, valide les messages, les publie dans RabbitMQ.

- **Message broker (RabbitMQ)**
  - Transport des événements entre backend et moteur de décision.
  - Exchanges et queues par type de message.

- **Base de données**
  - Stocke l’historique des incidents, interventions, ressources, utilisateurs et logs.

- **Keycloak**
  - Serveur d’authentification (OpenID Connect).
  - Gère les utilisateurs, rôles et clients (front, backend).

- **Qualité / Sécurité**
  - GitHub CodeQL pour l’analyse statique (bugs, vulnérabilités, dette technique).
  - Gitleaks pour la détection de secrets et autre dans le code.
  - Respect des bonnes pratiques OWASP (authentification, gestion des entrées, logs, ...)  