import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Tabs from './components/Tabs'
import QGPage from './pages/QGPage'
import TerrainPage from './pages/TerrainPage'
import { getStoredProfile, getStoredRoles, logoutUser } from './services/auth'

type OngletId = 'QG' | 'TERRAIN'

function App() {
  const [roles, setRoles] = useState<string[]>(getStoredRoles())
  const [profile, setProfile] = useState(getStoredProfile())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setRoles(getStoredRoles())
    setProfile(getStoredProfile())
  }, [])

  const isAdmin = roles.includes('ROLE_FRONT_Admin')
  const peutVoirQG = isAdmin || roles.includes('ROLE_FRONT_Operateur')
  const peutVoirTerrain = isAdmin || roles.includes('ROLE_FRONT_Terrain')

  const ongletsVisibles: { id: OngletId; label: string }[] = useMemo(() => {
    const resultat: { id: OngletId; label: string }[] = []
    if (peutVoirQG && isAdmin) resultat.push({ id: 'QG', label: 'QG' })
    if (peutVoirTerrain && isAdmin) resultat.push({ id: 'TERRAIN', label: 'Terrain' })
    return resultat
  }, [isAdmin, peutVoirQG, peutVoirTerrain])

  const defaultOnglet: OngletId = useMemo(() => {
    if (isAdmin) return ongletsVisibles[0]?.id ?? 'QG'
    if (peutVoirQG) return 'QG'
    if (peutVoirTerrain) return 'TERRAIN'
    return 'QG'
  }, [isAdmin, ongletsVisibles, peutVoirQG, peutVoirTerrain])

  const [ongletActif, setOngletActif] = useState<OngletId>(defaultOnglet)

  useEffect(() => {
    if (isAdmin) {
      if (
        ongletsVisibles.length > 0 &&
        !ongletsVisibles.some((onglet) => onglet.id === ongletActif)
      ) {
        setOngletActif(ongletsVisibles[0].id)
      }
    } else {
      setOngletActif(defaultOnglet)
    }
  }, [ongletsVisibles, ongletActif, isAdmin, defaultOnglet])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img
            src="/Logo-cpe.png"
            alt="Logo CPE"
            className="brand-logo"
          />
          <div>
            <h1 className="brand-title">SDMIS</h1>
          </div>
        </div>
        {isAdmin && ongletsVisibles.length > 0 && (
          <div className="header-tabs">
            <Tabs
              onglets={ongletsVisibles}
              actif={ongletActif}
              onChange={(id) => setOngletActif(id as OngletId)}
            />
          </div>
        )}
        <div className="header-user">
          <button
            type="button"
            className="user-chip"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <div className="avatar">
              {(profile?.fullName ?? 'Utilisateur').slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{profile?.fullName ?? 'Utilisateur'}</span>
              <span className="user-role">
                {isAdmin ? 'Admin' : roles.join(', ') || 'Connecté'}
              </span>
            </div>
          </button>
          {menuOpen && (
            <div className="user-menu">
              <div className="user-menu-item">
                <div className="avatar small">
                  {(profile?.fullName ?? 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{profile?.fullName ?? 'Utilisateur'}</strong>
                  <p className="muted small">{profile?.email ?? ''}</p>
                </div>
              </div>
              <button
                type="button"
                className="user-menu-action"
                onClick={() => {
                  setMenuOpen(false)
                  void logoutUser()
                }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {!isAdmin && !peutVoirQG && !peutVoirTerrain && (
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
