import { useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import { Map, Marker, NavigationControl } from 'react-map-gl/maplibre'
import type { ViewState } from 'react-map-gl/maplibre'
import type { Incident } from '../models/incident'
import type { Ressource } from '../models/resource'
import './MapView.css'

export type VueCarte = ViewState & { transitionDuration?: number }

interface Props {
  evenements?: Incident[]
  ressources?: Ressource[]
  pointInteret?: { latitude: number; longitude: number; label?: string }
  evenementSelectionneId?: string
  onSelectEvenement: (id: string) => void
  onClickPointInteret?: () => void
  vue: VueCarte
  onMove: (vue: VueCarte) => void
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
  onSelectEvenement,
  onClickPointInteret,
  vue,
  onMove,
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

  const styleCarte = useMemo<StyleSpecification>(
    () => ({
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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

  return (
    <div className="map-wrapper">
      <Map
        {...vue}
        mapLib={maplibregl}
        mapStyle={styleCarte}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
        onMove={(evt) => onMove(evt.viewState)}
      >
        <NavigationControl position="top-right" />
        {pointInteretValide && (
          <Marker
            longitude={pointInteretValide.longitude}
            latitude={pointInteretValide.latitude}
            anchor="bottom"
            onClick={onClickPointInteret}
          >
            <div
              className="marker marker-search"
              title={pointInteretValide.label}
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
            anchor="bottom"
            onClick={() => onSelectEvenement(evt.id)}
          >
            <div
              className={`marker ${classeEvenement(evt.gravite)} ${
                evenementSelectionneId === evt.id ? 'marker-active' : ''
              }`}
              title={evt.titre}
            >
              !
            </div>
          </Marker>
        ))}
        {ressourcesAffichees.map((ressource) => (
          <Marker
            key={ressource.id}
            longitude={ressource.longitude}
            latitude={ressource.latitude}
            anchor="bottom"
          >
            <div
              className="marker marker-vehicule"
              title={ressource.nom}
            >
              <VehicleIcon color={couleurRessource(ressource.disponibilite)} />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}

export default MapView
