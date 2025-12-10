# Système de gestion et suivi des incidents – SDMIS Lyon

## 1. Contexte

Ce projet est réalisé dans le cadre du module **4IRC – Projet Scientifique**.
Objectif : concevoir et développer un **système intégré** permettant le suivi quasi temps réel des incidents et interventions pour le SDMIS de Lyon/Villeurbanne, incluant :

- Une application QG / Terrain,
- Une simulation d’incidents et de véhicules,
- Une couche IoT (micro:bit),
- Une architecture sécurisée et industrialisée (DevOps, CI/CD, qualité, sécurité).

## 2. Architecture globale

### 2.1. Composants principaux

- **App QG (backend Java)**
  - Expose des API REST sécurisées.
  - Implémente le moteur de décision (affectation automatique de ressources).
  - Gère les incidents, interventions, véhicules et ressources en base de données.
  - Consomme les messages IoT / simulation via RabbitMQ.

- **Front QG (web)**
  - Interface opérateur (carte interactive, liste d’incidents, interventions).
  - Authentification via Keycloak.
  - Consomme uniquement les APIs du backend.

- **Simulation**
  - Génère des incidents et véhicules simulés.
  - Fait évoluer leur état (position, gravité, etc.).
  - Envoie les événements vers l’App QG (REST ou RabbitMQ).

- **IoT / micro:bit**
  - Micro:bit émetteur : représente les terminaux à bord des véhicules.
  - Micro:bit récepteur : connecté à un PC, qui joue le rôle de passerelle vers le datacenter.
  - Service `iot-gateway` : lit la liaison série, valide les messages, les publie dans RabbitMQ.

- **Message broker (RabbitMQ)**
  - Transport des événements entre IoT, simulation et backend.
  - Exchanges et queues par type de message (incidents, télémetrie, commandes).

- **Base de données**
  - Stocke l’historique des incidents, interventions, ressources, utilisateurs et logs.

- **Keycloak**
  - Serveur d’authentification (OpenID Connect).
  - Gère les utilisateurs, rôles et clients (front, backend).

- **Qualité / Sécurité**
  - SonarQube pour l’analyse statique (bugs, vulnérabilités, dette technique).
  - Gitleaks pour la détection de secrets dans le code.
  - Respect des bonnes pratiques OWASP (authentification, gestion des entrées, logs, ...)
