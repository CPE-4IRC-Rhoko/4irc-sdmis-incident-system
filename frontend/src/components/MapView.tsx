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
  evenementSelectionneId?: string
  onSelectEvenement: (id: string) => void
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

const classeRessource = (categorie: Ressource['categorie']) => {
  switch (categorie) {
    case 'POLICE':
      return 'marker-ressource police'
    case 'POMPIERS':
      return 'marker-ressource pompiers'
    case 'SAMU':
      return 'marker-ressource samu'
    default:
      return 'marker-ressource technique'
  }
}

function MapView({
  evenements = [],
  ressources = [],
  evenementSelectionneId,
  onSelectEvenement,
  vue,
  onMove,
}: Props) {
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
        {evenements.map((evt) => (
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
        {ressources.map((ressource) => (
          <Marker
            key={ressource.id}
            longitude={ressource.longitude}
            latitude={ressource.latitude}
            anchor="bottom"
          >
            <div
              className={`marker ${classeRessource(ressource.categorie)}`}
              title={ressource.nom}
            >
              ●
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}

export default MapView
