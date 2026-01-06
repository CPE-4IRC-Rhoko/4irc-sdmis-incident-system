import { useMemo, useState } from 'react'
import MapView, { type VueCarte } from '../components/MapView'
import { evenementsInitial } from '../data/incidents'
import { ressourcesInitiales } from '../data/resources'
import {
  LIBELLES_GRAVITE_INCIDENT,
  LIBELLES_STATUT_INCIDENT,
} from '../models/incident'
import type { GraviteIncident, Incident } from '../models/incident'
import type {
  CategorieRessource,
  Ressource,
} from '../models/resource'
import './QGPage.css'

const vueInitiale: VueCarte = {
  latitude: 45.7578,
  longitude: 4.8351,
  zoom: 12.4,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
}

const ordreGravite: Record<GraviteIncident, number> = {
  CRITIQUE: 3,
  MOYENNE: 2,
  FAIBLE: 1,
}

const libelleCategorie = (categorie: CategorieRessource) => {
  switch (categorie) {
    case 'POLICE':
      return 'Police / Gendarmerie'
    case 'POMPIERS':
      return 'Pompiers'
    case 'SAMU':
      return 'SAMU / Ambulances'
    case 'TECHNIQUE':
      return 'Soutien technique'
    default:
      return categorie
  }
}

function QGPage() {
  const [evenements] = useState<Incident[]>(evenementsInitial)
  const [ressources] = useState<Ressource[]>(ressourcesInitiales)
  const [evenementSelectionneId, setEvenementSelectionneId] = useState<
    string | undefined
  >(evenementsInitial[0]?.id)
  const [vueCarte, setVueCarte] = useState<VueCarte>(vueInitiale)

  const derniereMiseAJour = useMemo(
    () =>
      new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  )

  const evenementsActifs = useMemo(
    () => evenements.filter((evt) => evt.statut !== 'CLOTURE'),
    [evenements],
  )

  const ressourcesEngagees = useMemo(
    () => ressources.filter((res) => res.disponibilite === 'OCCUPE'),
    [ressources],
  )

  const tauxEngagement =
    ressources.length === 0
      ? 0
      : Math.round((ressourcesEngagees.length / ressources.length) * 100)

  const evenementsPrioritaires = useMemo(
    () =>
      [...evenements]
        .sort((a, b) => ordreGravite[b.gravite] - ordreGravite[a.gravite])
        .slice(0, 3),
    [evenements],
  )

  const ressourcesParCategorie = useMemo(() => {
    const base: Record<
      CategorieRessource,
      { total: number; dispo: number; occupe: number; horsLigne: number }
    > = {
      POLICE: { total: 0, dispo: 0, occupe: 0, horsLigne: 0 },
      POMPIERS: { total: 0, dispo: 0, occupe: 0, horsLigne: 0 },
      SAMU: { total: 0, dispo: 0, occupe: 0, horsLigne: 0 },
      TECHNIQUE: { total: 0, dispo: 0, occupe: 0, horsLigne: 0 },
    }
    ressources.forEach((res) => {
      const groupe = base[res.categorie]
      if (!groupe) return
      groupe.total += 1
      if (res.disponibilite === 'DISPONIBLE') groupe.dispo += 1
      if (res.disponibilite === 'OCCUPE') groupe.occupe += 1
      if (res.disponibilite === 'HORS_LIGNE') groupe.horsLigne += 1
    })
    return base
  }, [ressources])

  const actionsRecentes = [
    {
      titre: 'Déploiement automatique VSAV-04 sur l’evt #INC-003',
      horodatage: 'À l’instant',
    },
    {
      titre: 'Validation opérateur : périmètre de sécurité Zone Nord',
      horodatage: 'Il y a 12 min',
    },
    {
      titre: 'Rappel équipe maintenance pour inspection réseau',
      horodatage: 'Il y a 24 min',
    },
  ]

  return (
    <div className="qg-dashboard">
      <nav className="nav-vertical">
        <p className="nav-label">Navigation</p>
        <button className="nav-item nav-active" type="button">
          Tableau de bord
        </button>
        <button className="nav-item" type="button">
          Événements
        </button>
        <button className="nav-item" type="button">
          Ressources
        </button>
        <button className="nav-item" type="button">
          Affectations
        </button>
        <button className="nav-item" type="button">
          Décisions
        </button>
        <button className="nav-item" type="button">
          Historique
        </button>
        <div className="nav-separator" />
        <button className="nav-item" type="button">
          Paramètres
        </button>
      </nav>

      <section className="map-zone">
        <div className="map-search">
          <input
            type="text"
            placeholder="Localiser une adresse ou des coordonnées GPS..."
          />
          <button type="button" title="Rechercher">🔍</button>
        </div>
        <MapView
          evenements={evenements}
          ressources={ressources}
          evenementSelectionneId={evenementSelectionneId}
          onSelectEvenement={setEvenementSelectionneId}
          vue={vueCarte}
          onMove={setVueCarte}
        />
        <div className="map-legend">
          <p className="legend-title">Légende</p>
          <div className="legend-row">
            <span className="legend-dot crit"></span> Événement critique
          </div>
          <div className="legend-row">
            <span className="legend-dot modere"></span> Événement majeur
          </div>
          <div className="legend-row">
            <span className="legend-dot mineur"></span> Événement mineur
          </div>
          <div className="legend-row">
            <span className="legend-dot police"></span> Police / Gendarmerie
          </div>
          <div className="legend-row">
            <span className="legend-dot secours"></span> Secours / Santé
          </div>
          <div className="legend-row">
            <span className="legend-dot technique"></span> Technique
          </div>
        </div>
      </section>

      <aside className="situation-panel">
        <header className="panel-header">
          <div>
            <p className="muted">Situation Temps Réel</p>
            <p className="small">Dernière mise à jour : {derniereMiseAJour}</p>
          </div>
        </header>

        <div className="stat-grid">
          <div className="stat-card">
            <p className="muted">Événements actifs</p>
            <h3>{evenementsActifs.length}</h3>
            <p className="small accent">Suivi en temps réel (données démo)</p>
          </div>
          <div className="stat-card">
            <p className="muted">Unités terrain</p>
            <h3>{ressources.length}</h3>
            <p className="small accent">
              {ressourcesEngagees.length} engagées · {tauxEngagement}%
            </p>
          </div>
        </div>

        <section className="card-block">
          <div className="card-header">
            <h4>Événements prioritaires</h4>
            <button className="link">Tout voir</button>
          </div>
          <div className="priority-list">
            {evenementsPrioritaires.map((evt) => (
              <button
                key={evt.id}
                type="button"
                className={`priority-item ${
                  evenementSelectionneId === evt.id ? 'priority-active' : ''
                }`}
                onClick={() => setEvenementSelectionneId(evt.id)}
              >
                <div className="priority-top">
                  <span className={`pill gravite-${evt.gravite.toLowerCase()}`}>
                    {LIBELLES_GRAVITE_INCIDENT[evt.gravite]}
                  </span>
                  <span className="muted small">{evt.id}</span>
                </div>
                <p className="item-title">{evt.titre}</p>
                <p className="muted small">
                  {evt.description ?? 'Information en cours'}
                </p>
                <p className="muted small">
                  Statut : {LIBELLES_STATUT_INCIDENT[evt.statut]}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="card-block">
          <div className="card-header">
            <h4>État des ressources</h4>
          </div>
          <div className="resource-bars">
            {Object.entries(ressourcesParCategorie).map(([key, stats]) => (
              <div key={key} className="resource-line">
                <div className="resource-line-top">
                  <span>{libelleCategorie(key as CategorieRessource)}</span>
                  <span className="muted small">
                    {stats.dispo} dispo / {stats.total} total
                  </span>
                </div>
                <div className="resource-bar">
                  <span
                    className="bar dispo"
                    style={{
                      width: `${stats.total === 0 ? 0 : (stats.dispo / stats.total) * 100}%`,
                    }}
                  />
                  <span
                    className="bar occupe"
                    style={{
                      width: `${stats.total === 0 ? 0 : (stats.occupe / stats.total) * 100}%`,
                    }}
                  />
                  <span
                    className="bar hors-ligne"
                    style={{
                      width: `${stats.total === 0 ? 0 : (stats.horsLigne / stats.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card-block">
          <div className="card-header">
            <h4>Dernières actions</h4>
          </div>
          <div className="actions-list">
            {actionsRecentes.map((action) => (
              <div key={action.titre} className="action-item">
                <span className="dot" />
                <div>
                  <p className="item-title">{action.titre}</p>
                  <p className="muted small">{action.horodatage}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}

export default QGPage
