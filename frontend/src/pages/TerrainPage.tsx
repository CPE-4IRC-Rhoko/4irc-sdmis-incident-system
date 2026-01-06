import { useState } from 'react'
import MapView, { type VueCarte } from '../components/MapView'
import './TerrainPage.css'

const vueTerrain: VueCarte = {
  latitude: 45.7578,
  longitude: 4.8351,
  zoom: 11.5,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
}

function TerrainPage() {
  const [vue, setVue] = useState<VueCarte>(vueTerrain)

  return (
    <div className="terrain-layout">
      <div>
        <p className="muted">Vue terrain</p>
        <h2>Prêt pour la suite</h2>
        <p className="terrain-text">
          Cette page accueille les outils mobiles/terrain prochainement. La
          carte reste disponible pour un repérage rapide.
        </p>
      </div>
      <div className="terrain-map">
        <MapView
          evenements={[]}
          ressources={[]}
          onSelectEvenement={() => undefined}
          evenementSelectionneId={undefined}
          vue={vue}
          onMove={setVue}
        />
      </div>
    </div>
  )
}

export default TerrainPage
