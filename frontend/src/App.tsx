import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Tabs from './components/Tabs'
import QGPage from './pages/QGPage'
import TerrainPage from './pages/TerrainPage'
import type { RoleSimule } from './models/role'

type OngletId = 'QG' | 'TERRAIN'

function App() {
  const [role, setRole] = useState<RoleSimule>('QG')
  const [ongletActif, setOngletActif] = useState<OngletId>('QG')

  const ongletsVisibles: { id: OngletId; label: string }[] = useMemo(() => {
    if (role === 'QG') {
      return [{ id: 'QG', label: 'QG' }]
    }
    if (role === 'TERRAIN') {
      return [{ id: 'TERRAIN', label: 'Terrain' }]
    }
    return [
      { id: 'QG', label: 'QG' },
      { id: 'TERRAIN', label: 'Terrain' },
    ]
  }, [role])

  useEffect(() => {
    if (!ongletsVisibles.some((onglet) => onglet.id === ongletActif)) {
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
        <div className="role-switcher">
          <label htmlFor="role">Rôle simulé</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleSimule)}
          >
            <option value="QG">QG</option>
            <option value="TERRAIN">Terrain</option>
            <option value="DEV">Développeur</option>
          </select>
        </div>
      </header>

      <main className="app-main">
        <Tabs
          onglets={ongletsVisibles}
          actif={ongletActif}
          onChange={(id) => setOngletActif(id as OngletId)}
        />

        <section className="page-surface">
          {ongletActif === 'QG' ? <QGPage /> : <TerrainPage />}
        </section>
      </main>
    </div>
  )
}

export default App
