import { useEffect, useMemo, useState } from 'react'
import './RessourcesPage.css'
import { getVehiculesOperationnels } from '../services/vehicules'
import { getInterventions } from '../services/interventions'
import type { InterventionApi } from '../models/intervention'
import Modal from '../components/Modal'
import { withBaseUrl } from '../services/api'

type StatutVehicule = 'DISPONIBLE' | 'INTERVENTION' | 'MAINTENANCE'

type VehiculeView = {
  id: string
  position: string
  statut: StatutVehicule
  incidentId?: string | null
}

function RessourcesPage() {
  const [vehicules, setVehicules] = useState<VehiculeView[]>([])
  const [filtreTexte, setFiltreTexte] = useState('')
  const [filtreStatut, setFiltreStatut] = useState<StatutVehicule | 'TOUS'>(
    'TOUS',
  )
  const [etat, setEtat] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [modalInfo, setModalInfo] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setEtat('loading')
      setErreur(null)
      try {
        const [vehiculesApi, interventionsApi] = await Promise.all([
          getVehiculesOperationnels(controller.signal),
          getInterventions(controller.signal),
        ])
        const engages = new Map<string, InterventionApi>()
        interventionsApi.forEach((intervention) => {
          engages.set(intervention.idVehicule, intervention)
        })
        const views: VehiculeView[] = vehiculesApi.map((vehicule) => {
          const intervention = engages.get(vehicule.id)
          return {
            id: vehicule.id,
            position: `${vehicule.latitude.toFixed(4)}, ${vehicule.longitude.toFixed(4)}`,
            statut: intervention ? 'INTERVENTION' : 'DISPONIBLE',
            incidentId: intervention?.idEvenement,
          }
        })
        setVehicules(views)
        setEtat('ready')
        setPage(1)
      } catch (error) {
        if (controller.signal.aborted) return
        setErreur(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les ressources',
        )
        setEtat('error')
      }
    }
    void charger()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const url = withBaseUrl('/api/vehicules/sse')
    const es = new EventSource(url)
    es.addEventListener('vehicules', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as Array<{
          id: string
          latitude: number
          longitude: number
          statut: string
          caserne?: string
          equipements?: Array<{ nomEquipement: string; contenanceCourante: number }>
        }>
        setVehicules((prev) => {
          const map = new Map(prev.map((v) => [v.id, v]))
          data.forEach((veh) => {
            const statut: StatutVehicule = veh.statut.toLowerCase().includes('intervention')
              ? 'INTERVENTION'
              : veh.statut.toLowerCase().includes('dispon')
                ? 'DISPONIBLE'
                : 'MAINTENANCE'
            map.set(veh.id, {
              id: veh.id,
              position: `${veh.latitude.toFixed(4)}, ${veh.longitude.toFixed(4)}`,
              statut,
              incidentId: map.get(veh.id)?.incidentId ?? undefined,
            })
          })
          return Array.from(map.values())
        })
      } catch (error) {
        console.error('Erreur SSE ressources', error)
      }
    })
    es.onerror = (err) => {
      console.error('SSE ressources erreur', err)
    }
    return () => es.close()
  }, [])

  const vehiculesFiltres = useMemo(() => {
    const texte = filtreTexte.trim().toLowerCase()
    return vehicules.filter((v) => {
      const okTexte =
        texte.length === 0 ||
        v.id.toLowerCase().includes(texte) ||
        v.position.toLowerCase().includes(texte)
      const okStatut = filtreStatut === 'TOUS' || v.statut === filtreStatut
      return okTexte && okStatut
    })
  }, [vehicules, filtreTexte, filtreStatut])

  const totalPages = Math.max(1, Math.ceil(vehiculesFiltres.length / pageSize))
  const vehiculesPage = useMemo(() => {
    const start = (page - 1) * pageSize
    return vehiculesFiltres.slice(start, start + pageSize)
  }, [vehiculesFiltres, page])

  const metriques = useMemo(() => {
    const total = vehicules.length
    const dispo = vehicules.filter((v) => v.statut === 'DISPONIBLE').length
    const intervention = vehicules.filter((v) => v.statut === 'INTERVENTION')
      .length
    const maintenance = vehicules.filter((v) => v.statut === 'MAINTENANCE')
      .length
    return { total, dispo, intervention, maintenance }
  }, [vehicules])

  return (
    <div className="ressources-page">
      <header className="resources-header">
        <div>
          <p className="muted small">Supervision en temps réel</p>
          <h2>Gestion des ressources</h2>
        </div>
        <button
          className="primary"
          type="button"
          onClick={() => setModalInfo(true)}
        >
          Ajouter un véhicule
        </button>
      </header>

      <div className="resources-metrics">
        <div className="metric-card">
          <p className="muted small">Total véhicules</p>
          <h3>{metriques.total}</h3>
        </div>
        <div className="metric-card success">
          <p className="muted small">Disponibles</p>
          <h3>{metriques.dispo}</h3>
        </div>
        <div className="metric-card warning">
          <p className="muted small">En intervention</p>
          <h3>{metriques.intervention}</h3>
        </div>
        <div className="metric-card neutre">
          <p className="muted small">Maintenance</p>
          <h3>{metriques.maintenance}</h3>
        </div>
      </div>

      <div className="resources-toolbar">
        <div className="toolbar-input">
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par ID camion ou position..."
            value={filtreTexte}
            onChange={(e) => setFiltreTexte(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <label>
            État
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value as StatutVehicule | 'TOUS')}
            >
              <option value="TOUS">Tous</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="INTERVENTION">En intervention</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </label>
        </div>
      </div>

      <div className="resources-table-card">
        {etat === 'loading' && (
          <div className="table-placeholder">Chargement des ressources...</div>
        )}
        {etat === 'error' && (
          <div className="table-placeholder erreur">{erreur}</div>
        )}
        {etat === 'ready' && vehiculesPage.length === 0 && (
          <div className="table-placeholder">
            Aucune ressource ne correspond aux filtres.
          </div>
        )}
        {etat === 'ready' && vehiculesPage.length > 0 && (
          <table className="resources-table">
            <thead>
              <tr>
                <th>ID camion</th>
                <th>Position actuelle</th>
                <th>Disponibilité</th>
                <th>Incident assigné</th>
              </tr>
            </thead>
            <tbody>
              {vehiculesPage.map((v) => (
                <tr key={v.id}>
                  <td className="id-cell">{v.id.slice(0, 8)}</td>
                  <td>{v.position}</td>
                  <td>
                    <span className={`badge ${v.statut.toLowerCase()}`}>
                      {v.statut === 'DISPONIBLE'
                        ? 'Disponible'
                        : v.statut === 'INTERVENTION'
                          ? 'En intervention'
                          : 'Maintenance'}
                    </span>
                  </td>
                  <td>{v.incidentId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {etat === 'ready' && vehiculesFiltres.length > 0 && (
          <div className="pagination">
            <div className="muted small">
              Affichage de {(page - 1) * pageSize + 1} à{' '}
              {Math.min(page * pageSize, vehiculesFiltres.length)} sur{' '}
              {vehiculesFiltres.length} ressources
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const num = idx + 1
                const visible =
                  num === 1 ||
                  num === totalPages ||
                  (num >= page - 1 && num <= page + 1)
                if (!visible) {
                  if (num === 2 || num === totalPages - 1) {
                    return (
                      <span key={num} className="pagination-dots">
                        …
                      </span>
                    )
                  }
                  return null
                }
                return (
                  <button
                    key={num}
                    type="button"
                    className={num === page ? 'active' : ''}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {modalInfo && (
        <Modal titre="Ajouter un véhicule" onClose={() => setModalInfo(false)}>
          <p>
            L’API actuelle ne fournit pas encore d’endpoint pour créer un
            véhicule. À implémenter côté backend :
          </p>
          <pre className="api-spec">
POST /api/vehicules
Content-Type: application/json
{`{
  "plaque_immat": "AA100AA",
  "latitude": 48.8568,
  "longitude": 2.352,
  "derniere_position_connue": "2026-01-06T18:05:50Z",
  "ressources": { "eau": 25, "Extincteur": 25 },
  "cle_ident": "Key16_Secret!!!!",
  "id_caserne": "7b5e3a75-b194-4de0-a998-c7ee2178df0e",
  "id_statut": "a17df548-1981-495e-a58d-5ee2e28e188e"
}`}
          </pre>
          <p>
            Endpoints utiles à ajouter pour compléter la page :
            <br />• <strong>GET /api/vehicules</strong> (tous les véhicules avec
            statut, caserne)
            <br />• <strong>GET /api/references/casernes</strong> pour
            alimenter la liste des casernes
            <br />• <strong>GET /api/references/statuts-vehicule</strong> pour
            choisir le statut initial (ex : Maintenance)
          </p>
        </Modal>
      )}
    </div>
  )
}

export default RessourcesPage
