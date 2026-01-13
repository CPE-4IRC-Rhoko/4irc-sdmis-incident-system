import { useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import type { LayerProps } from '@vis.gl/react-maplibre'
import {
  Layer,
  Map,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type ViewState,
} from 'react-map-gl/maplibre'
import type { Incident } from '../models/incident'
import type { Ressource } from '../models/resource'
import './MapView.css'

export type VueCarte = ViewState & { transitionDuration?: number }

export type RouteTrace = {
  id: string
  coordinates: Array<[number, number]>
  color?: string
}

interface Props {
  evenements?: Incident[]
  ressources?: Ressource[]
  pointInteret?: { latitude: number; longitude: number; label?: string }
  evenementSelectionneId?: string
  popupEvenementId?: string | null
  popupRessourceId?: string | null
  onSelectEvenement: (id: string) => void
  onSelectRessource?: (id: string) => void
  onClosePopups?: () => void
  onClickPointInteret?: () => void
  statutEvenementParId?: Record<string, string>
  interactionEnabled?: boolean
  navigationEnabled?: boolean
  compactMarkers?: boolean
  routes?: RouteTrace[]
  vue: VueCarte
  onMove: (vue: VueCarte) => void
  casernes?: Array<{ id: string; nom?: string; latitude: number; longitude: number }>
}

const attribution =
  '© <a href="https://www.openstreetmap.org/copyright">Contributeurs OSM</a>'

const classeEvenement = (gravite: Incident['gravite']) => {
  if (gravite === 'CRITIQUE') return 'marker-evenement critique'
  if (gravite === 'MOYENNE') return 'marker-evenement moyenne'
  return 'marker-evenement faible'
}

const couleurRessource = (disponibilite: Ressource['disponibilite']) => {
  if (disponibilite === 'OCCUPE') return '#2364d2'
  if (disponibilite === 'DISPONIBLE') return '#2fbf71'
  return '#94a3b8'
}

const VehicleIcon = ({ color }: { color: string }) => (
  <svg
    className="vehicle-icon"
    width="34"
    height="22"
    viewBox="0 0 34 22"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="3" y="8" width="20" height="8" rx="2" fill={color} />
    <rect x="9" y="4" width="10" height="5" rx="1" fill={color} />
    <rect x="23" y="10" width="7" height="4" rx="1" fill={color} />
    <circle cx="11" cy="17" r="3" fill="#ffffff" />
    <circle cx="22" cy="17" r="3" fill="#ffffff" />
    <circle cx="11" cy="17" r="1.4" fill={color} />
    <circle cx="22" cy="17" r="1.4" fill={color} />
  </svg>
)

const PinIcon = ({ color }: { color: string }) => (
  <svg
    className="pin-icon"
    width="26"
    height="32"
    viewBox="0 0 26 32"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M13 31C13 31 25 19.5 25 11.5C25 5.7 19.8 1 13 1C6.2 1 1 5.7 1 11.5C1 19.5 13 31 13 31Z"
      fill={color}
      stroke="#ffffff"
      strokeWidth="1.6"
    />
    <circle cx="13" cy="12" r="4" fill="#ffffff" />
  </svg>
)

function MapView({
  evenements = [],
  ressources = [],
  pointInteret,
  evenementSelectionneId,
  popupEvenementId,
  popupRessourceId,
  onSelectEvenement,
  onSelectRessource,
  onClosePopups,
  onClickPointInteret,
  statutEvenementParId,
  interactionEnabled = true,
  navigationEnabled = true,
  compactMarkers = false,
  routes = [],
  vue,
  onMove,
  casernes,
}: Props) {
const isValidCoord = (lat?: number, lon?: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  (lat as number) >= -90 &&
  (lat as number) <= 90 &&
  (lon as number) >= -180 &&
  (lon as number) <= 180

  const evenementsAffiches = useMemo(
    () => evenements.filter((evt) => isValidCoord(evt.latitude, evt.longitude)),
    [evenements],
  )

  const ressourcesAffichees = useMemo(
    () =>
      ressources.filter((res) => isValidCoord(res.latitude, res.longitude)),
    [ressources],
  )

  const pointInteretValide =
    pointInteret && isValidCoord(pointInteret.latitude, pointInteret.longitude)
      ? pointInteret
      : undefined

  const casernesAffichees = useMemo(() => {
    if (!casernes) return []
    return casernes
      .filter((c) => isValidCoord(c.latitude, c.longitude))
      .map((c) => ({
        ...c,
        latitude: c.latitude,
        longitude: c.longitude,
      }))
  }, [casernes])

  const styleCarte = useMemo<StyleSpecification>(
    () => ({
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          ],
          tileSize: 256,
          attribution,
        },
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
        },
      ],
    }),
    [],
  )

  const routesGeojson = useMemo(() => {
    if (!routes || routes.length === 0) return null
    const features = routes
      .filter(
        (route) =>
          Array.isArray(route.coordinates) && route.coordinates.length >= 2,
      )
      .map((route) => ({
        type: 'Feature' as const,
        properties: {
          color: route.color ?? '#0ea5e9',
          id: route.id,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: route.coordinates,
        },
      }))
    if (features.length === 0) return null
    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [routes])

  const routeCasingLayer: LayerProps = {
    id: 'routes-casing',
    type: 'line',
    source: 'routes',
    paint: {
      'line-color': '#ffffff',
      'line-width': 7,
      'line-opacity': 0.52,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  }

  const routeLayer: LayerProps = {
    id: 'routes-layer',
    type: 'line',
    source: 'routes',
    paint: {
      'line-color': ['get', 'color'] as any,
      'line-width': 5,
      'line-opacity': 0.9,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  }

  const popupEvenement = popupEvenementId
    ? evenementsAffiches.find((evt) => evt.id === popupEvenementId)
    : undefined
  const popupRessource =
    popupRessourceId != null
      ? ressourcesAffichees.find((res) => res.id === popupRessourceId)
      : undefined

  const markerScale = useMemo(() => {
    const z = vue?.zoom ?? 12
    // Garder une taille stable en dézoomant.
    return Math.max(0.55, Math.min(1.05, z / 14))
  }, [vue?.zoom])

  return (
    <div className="map-wrapper">
      <Map
        {...vue}
        mapLib={maplibregl}
        mapStyle={styleCarte}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
        onMove={(evt) => onMove(evt.viewState)}
        interactive={interactionEnabled}
        dragPan={interactionEnabled}
        scrollZoom={interactionEnabled}
        doubleClickZoom={interactionEnabled}
        touchZoomRotate={interactionEnabled}
        onClick={() => onClosePopups?.()}
      >
        {routesGeojson && (
          <Source id="routes" type="geojson" data={routesGeojson}>
            <Layer {...routeCasingLayer} />
            <Layer {...routeLayer} />
          </Source>
        )}
        {navigationEnabled && <NavigationControl position="top-right" />}
        {casernesAffichees.map((caserne) => (
          <Marker
            key={caserne.id}
            longitude={caserne.longitude}
            latitude={caserne.latitude}
            anchor="bottom"
          >
            <div
              className="marker marker-caserne"
              title={caserne.nom ?? 'Caserne'}
            >
              🏥
            </div>
          </Marker>
        ))}
        {pointInteretValide && (
          <Marker
            longitude={pointInteretValide.longitude}
            latitude={pointInteretValide.latitude}
            anchor="bottom"
          onClick={(e) => {
            e.originalEvent?.stopPropagation()
            onClickPointInteret?.()
          }}
        >
            <div
              className="marker marker-search"
              title={pointInteretValide.label}
              style={{ transform: `scale(${markerScale})` }}
            >
              <PinIcon color="#111827" />
            </div>
          </Marker>
        )}
        {evenementsAffiches.map((evt) => (
          <Marker
            key={evt.id}
            longitude={evt.longitude}
            latitude={evt.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent?.stopPropagation()
              onSelectEvenement(evt.id)
            }}
          >
            {compactMarkers ? (
              <div
                className={`mini-marker ${classeEvenement(evt.gravite).split(' ').pop()}`}
                style={{ transform: `scale(${markerScale})` }}
              >
                <span className="mini-marker-inner" />
              </div>
            ) : (
              <div
                className={`marker ${classeEvenement(evt.gravite)} ${
                  evenementSelectionneId === evt.id ? 'marker-active' : ''
                }`}
                title={evt.titre}
                style={{ transform: `scale(${markerScale})` }}
              >
                !
              </div>
            )}
          </Marker>
        ))}
        {ressourcesAffichees.map((ressource) => (
          <Marker
            key={ressource.id}
            longitude={ressource.longitude}
            latitude={ressource.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent?.stopPropagation()
              onSelectRessource?.(ressource.id)
            }}
          >
            <div
              className="marker marker-vehicule"
              title={ressource.nom}
              style={{ transform: `scale(${markerScale})` }}
            >
              <VehicleIcon color={couleurRessource(ressource.disponibilite)} />
            </div>
          </Marker>
        ))}
        {popupEvenement && (
          <Popup
            longitude={popupEvenement.longitude}
            latitude={popupEvenement.latitude}
            anchor="top"
            closeOnClick={false}
            closeButton
            focusAfterOpen={false}
            onClose={onClosePopups}
          >
            <div className="popup-content">
              <h4>{popupEvenement.titre}</h4>
              <p className="muted small">
                Gravité : {popupEvenement.gravite}
              </p>
              <p className="muted small">
                Statut :{' '}
                {statutEvenementParId?.[popupEvenement.id] ??
                  popupEvenement.statut}
              </p>
              <p className="muted small">
                {popupEvenement.latitude.toFixed(4)},{' '}
                {popupEvenement.longitude.toFixed(4)}
              </p>
              {popupEvenement.description && (
                <p className="muted small">{popupEvenement.description}</p>
              )}
            </div>
          </Popup>
        )}
        {popupRessource && (
          <Popup
            longitude={popupRessource.longitude}
            latitude={popupRessource.latitude}
            anchor="top"
            closeOnClick={false}
            closeButton
            focusAfterOpen={false}
            onClose={onClosePopups}
          >
            <div className="popup-content">
              <h4>{popupRessource.nom}</h4>
              <p className="muted small">
                Statut : {popupRessource.statutBrut ?? popupRessource.disponibilite}
              </p>
              <p className="muted small">
                Plaque : {popupRessource.plaque ?? '—'}
              </p>
              <p className="muted small">
                {popupRessource.latitude.toFixed(4)},{' '}
                {popupRessource.longitude.toFixed(4)}
              </p>
              <div className="muted small">
                Ressources :
                {popupRessource.equipements && popupRessource.equipements.length > 0 ? (
                  <ul>
                    {popupRessource.equipements.map((eq) => (
                      <li key={`${popupRessource.id}-${eq.nom ?? 'equip'}`}>
                        {eq.nom ?? 'Équipement'} ({eq.contenance ?? 0})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">—</p>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}

export default MapView
