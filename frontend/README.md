# 4IRC - QG/Terrain (front-end)

Une base React + TypeScript + Vite en français pour piloter la vue QG/Terrain avec une carte MapLibre et des données fictives.

## Démarrer

```bash
cd frontend
npm install
npm run dev
```

## Notes techniques
- MapLibre via `react-map-gl/maplibre` + tuiles OSM (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).

## Authentification Keycloak
- Une redirection automatique vers Keycloak est déclenchée dès l'ouverture de l'application pour authentifier l'utilisateur.
- Variables d'environnement Vite obligatoires (dans un `.env` à la racine du dossier `frontend`) :
  - `VITE_ENABLE_KEYCLOAK=true` pour activer/désactiver la redirection.
  - `VITE_KEYCLOAK_AUTH_URL` (URL d'authorize complète).
  - `VITE_KEYCLOAK_TOKEN_URL` (endpoint token pour l'échange code → token PKCE).
  - `VITE_KEYCLOAK_CLIENT_ID` (client côté Keycloak).
  - `VITE_KEYCLOAK_REDIRECT_URI` (URL de retour).
  - `VITE_KEYCLOAK_SCOPE` et `VITE_KEYCLOAK_RESPONSE_TYPE` (ex. `openid profile email` / `code`).

Des presets sont fournis :
- `frontend/.env.development` : redirection vers `http://localhost:4173/callback`.
- `frontend/.env.production` : redirection vers `https://sdmis.4irc.hugorodrigues.fr/callback`.
Vite charge automatiquement le bon fichier selon le mode (`npm run dev` → `.env.development`, `npm run build` → `.env.production`).

Flux de callback :
- Keycloak doit rediriger vers `/callback` (voir `VITE_KEYCLOAK_REDIRECT_URI` et les URIs autorisées côté Keycloak).
- Le callback stocke `access_token` si fourni (hash), extrait les rôles (`realm_access` + `resource_access[clientId]`) et renvoie vers la page d’origine.
