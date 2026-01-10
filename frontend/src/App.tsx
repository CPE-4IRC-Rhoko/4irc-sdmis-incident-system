import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Tabs from './components/Tabs'
import QGPage from './pages/QGPage'
import TerrainPage from './pages/TerrainPage'
import { getStoredRoles } from './services/auth'

type OngletId = 'QG' | 'TERRAIN'

function App() {
  const [roles, setRoles] = useState<string[]>(getStoredRoles())

  useEffect(() => {
    setRoles(getStoredRoles())
  }, [])

  const peutVoirQG = roles.includes('ROLE_FRONT_Admin') || roles.includes('ROLE_FRONT_Operateur')
  const peutVoirTerrain = roles.includes('ROLE_FRONT_Admin') || roles.includes('ROLE_FRONT_Terrain')

  const ongletsVisibles: { id: OngletId; label: string }[] = useMemo(() => {
    const resultat: { id: OngletId; label: string }[] = []
    if (peutVoirQG) resultat.push({ id: 'QG', label: 'QG' })
    if (peutVoirTerrain) resultat.push({ id: 'TERRAIN', label: 'Terrain' })
    return resultat
  }, [peutVoirQG, peutVoirTerrain])

  const [ongletActif, setOngletActif] = useState<OngletId>(
    ongletsVisibles[0]?.id ?? 'QG',
  )

  useEffect(() => {
    if (
      ongletsVisibles.length > 0 &&
      !ongletsVisibles.some((onglet) => onglet.id === ongletActif)
    ) {
      setOngletActif(ongletsVisibles[0].id)
    }
  }, [ongletsVisibles, ongletActif])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">4</div>
          <div>
            <p className="brand-kicker">Simulation</p>
            <h1 className="brand-title">4IRC - QG/Terrain</h1>
          </div>
        </div>
      </header>

      <main className="app-main">
        {ongletsVisibles.length > 0 ? (
          <Tabs
            onglets={ongletsVisibles}
            actif={ongletActif}
            onChange={(id) => setOngletActif(id as OngletId)}
          />
        ) : (
          <div className="app-no-access">Aucun onglet disponible : aucun rôle autorisé détecté.</div>
        )}

        <section className="page-surface">
          {ongletActif === 'QG' && peutVoirQG && <QGPage />}
          {ongletActif === 'TERRAIN' && peutVoirTerrain && <TerrainPage />}
        </section>
      </main>
    </div>
  )
}

export default App
