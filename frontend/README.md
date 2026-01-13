# 4IRC - QG/Terrain (front-end)

Interface React + TypeScript (Vite) pour piloter la vue QG/Terrain : carte MapLibre, suivi temps-réel des événements et affectations, authentification Keycloak.

## Prérequis
- Node.js 20+ et npm.
- Accès Keycloak (`sdmis-frontend`) et à l’API SDMIS.
- Variables d’environnement Vite disponibles (voir ci-dessous).

## Installation rapide
```bash
cd frontend
npm install
npm run dev
```

Scripts utiles :
- `npm run dev` : serveur Vite en développement.
- `npm run build` : build production (`dist/`).
- `npm run preview` : prévisualisation du build.
- `npm run lint` : lint TypeScript/React.

## Services et appels externes

### Authentification Keycloak
- Redirection automatique dès l’ouverture. Le callback `/callback` stocke `access_token`, extrait les rôles (`realm_access` + `resource_access[clientId]`) puis renvoie vers la page d’origine.

### API SDMIS (backend)
- Base : `VITE_API_URL` (`https://api.4irc.hugorodrigues.fr` en prod, override possible en local).
- Endpoints consommés :
  - REST : `/api/evenements`, `/api/interventions`, `/api/vehicules/operationnels`, `/api/vehicules/register`, `/api/vehicules/cle-ident`, `/api/references/{severites|types-evenement|casernes|equipements}`, `/api/interventions/validation`.
  - Snapshots : `/api/evenements/snapshots`, `/api/interventions/snapshots`, `/api/vehicules/snapshots`.
  - Temps réel : SSE sur `/api/sdmis/sse` (polyfill `event-source-polyfill` + header `Authorization: Bearer <token>`).

### Cartographie et géocodage
- Fond de carte raster Carto (style Voyager) : `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` (attribution OSM).
- Routage OSRM : instance projet `https://api-osrm.4irc.hugorodrigues.fr` (configurable via `VITE_OSRM_URL`), repli automatique sur l’instance publique `https://router.project-osrm.org` en cas d’échec.
- Géocodage / recherche d’adresse : Nominatim OSM `https://nominatim.openstreetmap.org/search` (limite à 5 résultats, headers `Accept` + `Accept-Language: fr`).

### Autres ressources externes
- Police Space Grotesk depuis Google Fonts (`https://fonts.googleapis.com`).

## Stack technique
- React 19 + TypeScript + Vite 7.
- MapLibre via `react-map-gl/maplibre` + `maplibre-gl`.
- `event-source-polyfill` pour la tolérance réseau des flux SSE.
- ESLint 9 (config TypeScript/React) pour la qualité de code.
