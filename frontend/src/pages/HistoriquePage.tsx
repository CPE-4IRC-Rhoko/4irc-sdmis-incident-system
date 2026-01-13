import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './HistoriquePage.css'
import { getEvenementsSnapshots } from '../services/evenements'
import { getInterventionsSnapshots } from '../services/interventions'
import { getVehiculesSnapshots } from '../services/vehicules'
import {
  subscribeSdmisSse,
  type EvenementSnapshot,
  type InterventionSnapshot,
  type VehiculeSnapshot,
} from '../services/sse'

type LogKind = 'CREATION' | 'DECISION' | 'AFFECTATION' | 'FIN'

type TimelineEntry = {
  id: string
  fingerprint: string
  kind: LogKind
  at: string
  incidentId?: string
  incidentLabel: string
  description: string
  badgeNote?: string
  vehicule?: string
  source: 'snapshot' | 'live'
}

const KINDS: LogKind[] = ['CREATION', 'DECISION', 'AFFECTATION', 'FIN']
const FINGERPRINT_STORAGE_KEY = 'sdmis-historique-fingerprints'

const kindLabel = (kind: LogKind) => {
  switch (kind) {
    case 'CREATION':
      return 'Création incident'
    case 'DECISION':
      return 'Décision moteur'
    case 'AFFECTATION':
      return 'Affectation'
    case 'FIN':
      return 'Fin d’intervention'
    default:
      return 'Événement'
  }
}

const toHour = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10)

const isSameDay = (isoDate: string, day: string) => {
  const target = new Date(`${day}T00:00:00`)
  const d = new Date(isoDate)
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  )
}

const determineKindFromStatus = (
  status: string | null | undefined,
  hasEnd: boolean,
): LogKind => {
  if (hasEnd) return 'FIN'
  const texte = (status ?? '').toLowerCase()
  if (
    texte.includes('résol') ||
    texte.includes('resol') ||
    texte.includes('clos') ||
    texte.includes('clôt') ||
    texte.includes('term') ||
    texte.includes('fin')
  ) {
    return 'FIN'
  }
  if (
    texte.includes('decision') ||
    texte.includes('décision') ||
    texte.includes('propos') ||
    texte.includes('ia') ||
    texte.includes('auto')
  ) {
    return 'DECISION'
  }
  if (
    texte.includes('affect') ||
    texte.includes('envoy') ||
    texte.includes('cours') ||
    texte.includes('assign')
  ) {
    return 'AFFECTATION'
  }
  return 'AFFECTATION'
}

const synthesizeTime = (index: number) =>
  new Date(Date.now() - index * 4 * 60 * 1000).toISOString()

const chargerEmpreintes = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const brut = sessionStorage.getItem(FINGERPRINT_STORAGE_KEY)
    if (!brut) return []
    const parsed = JSON.parse(brut)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

const sauvegarderEmpreintes = (empreintes: Set<string>) => {
  if (typeof window === 'undefined') return
  const MAX = 1200
  const arr = Array.from(empreintes)
  const trimmed = arr.length > MAX ? arr.slice(arr.length - MAX) : arr
  try {
    sessionStorage.setItem(FINGERPRINT_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // non bloquant
  }
}

function HistoriquePage() {
  const [etat, setEtat] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(dateInputValue(new Date()))
  const [filtreTypes, setFiltreTypes] = useState<Set<LogKind>>(
    () => new Set(KINDS),
  )
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [rechercheTexte, setRechercheTexte] = useState('')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)

  const evenementsRef = useRef<Map<string, EvenementSnapshot>>(new Map())
  const interventionsRef = useRef<Map<string, InterventionSnapshot>>(new Map())
  const vehiculesRef = useRef<Map<string, VehiculeSnapshot>>(new Map())
  const fingerprintsRef = useRef<Set<string>>(new Set())
  const typeMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const existantes = chargerEmpreintes()
    if (existantes.length > 0) {
      fingerprintsRef.current = new Set(existantes)
    }
  }, [])

  const ajouterEntries = useCallback((ajouts: TimelineEntry[]) => {
    if (!ajouts || ajouts.length === 0) return
    const uniques = ajouts.filter((entry) => {
      if (fingerprintsRef.current.has(entry.fingerprint)) return false
      fingerprintsRef.current.add(entry.fingerprint)
      return true
    })
    if (uniques.length === 0) return
    setEntries((prev) => {
      const next = [...uniques, ...prev]
      next.sort(
        (a, b) =>
          new Date(b.at).getTime() - new Date(a.at).getTime(),
      )
      return next.slice(0, 400)
    })
    sauvegarderEmpreintes(fingerprintsRef.current)
  }, [])

  const buildEvenementEntry = useCallback(
    (
      snapshot: EvenementSnapshot,
      source: 'snapshot' | 'live',
      indexFallback = 0,
    ): TimelineEntry => {
      const at = synthesizeTime(indexFallback)
      const fingerprint = `creation-${snapshot.idEvenement}`
      return {
        id: `${fingerprint}-${indexFallback}`,
        fingerprint,
        kind: 'CREATION',
        at,
        incidentId: snapshot.idEvenement,
        incidentLabel: snapshot.typeEvenement ?? 'Incident',
        description:
          snapshot.description?.trim().length && snapshot.description !== snapshot.typeEvenement
            ? snapshot.description
            : `Création d’incident ${snapshot.typeEvenement ?? ''}`.trim(),
        source,
      }
    },
    [],
  )

  const buildInterventionEntry = useCallback(
    (
      snapshot: InterventionSnapshot,
      source: 'snapshot' | 'live',
      kindOverride?: LogKind,
    ): TimelineEntry => {
      const incident = evenementsRef.current.get(snapshot.idEvenement)
      const vehicule =
        snapshot.plaqueImmat ??
        vehiculesRef.current.get(snapshot.idVehicule)?.plaqueImmat ??
        snapshot.idVehicule?.slice(0, 8)
      const kind = kindOverride
        ? kindOverride
        : determineKindFromStatus(snapshot.statusIntervention, !!snapshot.dateFinIntervention)
      const at =
        snapshot.dateFinIntervention ??
        snapshot.dateDebutIntervention ??
        new Date().toISOString()
      const statutTexte = snapshot.statusIntervention ?? ''
      const fingerprint = `${kind}-${snapshot.idEvenement}-${snapshot.idVehicule}-${statutTexte.toLowerCase()}-${snapshot.dateFinIntervention ?? snapshot.dateDebutIntervention ?? 'now'}`
      const description =
        kind === 'FIN'
          ? `Intervention close pour ${vehicule ?? 'véhicule inconnu'}.`
          : `Véhicule ${vehicule ?? snapshot.idVehicule} — ${statutTexte || 'Affectation en cours'}.`
      return {
        id: fingerprint,
        fingerprint,
        kind,
        at,
        incidentId: snapshot.idEvenement,
        incidentLabel: incident?.typeEvenement ?? 'Incident',
        description,
        badgeNote:
          kind === 'DECISION' && statutTexte
            ? statutTexte
            : undefined,
        vehicule,
        source,
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setEtat('loading')
      setErreur(null)
      try {
        const [evenements, interventions, vehicules] = await Promise.all([
          getEvenementsSnapshots(controller.signal),
          getInterventionsSnapshots(controller.signal),
          getVehiculesSnapshots(controller.signal),
        ])
        evenementsRef.current = new Map(
          evenements.map((evt) => [evt.idEvenement, evt]),
        )
        vehiculesRef.current = new Map(
          vehicules.map((veh) => [veh.id, veh]),
        )
        interventionsRef.current = new Map(
          interventions.map((intervention) => [
            `${intervention.idEvenement}-${intervention.idVehicule}`,
            intervention,
          ]),
        )
        const seeded: TimelineEntry[] = []
        evenements.forEach((evt, idx) => {
          seeded.push(buildEvenementEntry(evt, 'snapshot', idx))
        })
        interventions.forEach((intervention, idx) => {
          if (intervention.dateDebutIntervention) {
            seeded.push(buildInterventionEntry(intervention, 'snapshot'))
          }
          if (intervention.dateFinIntervention) {
            seeded.push(
              buildInterventionEntry(intervention, 'snapshot', 'FIN'),
            )
          } else if (!intervention.dateDebutIntervention) {
            // Pas de date connue : créer un log synthétique pour garder une trace.
            const synthetic = {
              ...intervention,
              dateDebutIntervention: synthesizeTime(idx + evenements.length),
            }
            seeded.push(buildInterventionEntry(synthetic, 'snapshot'))
          }
        })
        ajouterEntries(seeded)
        setEtat('ready')
      } catch (error) {
        if (controller.signal.aborted) return
        setErreur(
          error instanceof Error
            ? error.message
            : 'Impossible de charger l’historique.',
        )
        setEtat('error')
      }
    }
    void charger()
    return () => controller.abort()
  }, [ajouterEntries, buildEvenementEntry, buildInterventionEntry])

  useEffect(() => {
    const es = subscribeSdmisSse({
      onEvenements: (snapshots) => {
        if (!snapshots || snapshots.length === 0) return
        const nouveaux: TimelineEntry[] = []
        snapshots.forEach((snapshot) => {
          const precedent = evenementsRef.current.get(snapshot.idEvenement)
          evenementsRef.current.set(snapshot.idEvenement, snapshot)
          if (!precedent) {
            nouveaux.push(buildEvenementEntry(snapshot, 'live'))
            return
          }
          if (precedent.statutEvenement !== snapshot.statutEvenement) {
            const fingerprint = `evt-statut-${snapshot.idEvenement}-${snapshot.statutEvenement?.toLowerCase() ?? 'statut'}`
            nouveaux.push({
              id: fingerprint,
              fingerprint,
              kind: determineKindFromStatus(snapshot.statutEvenement, false),
              at: new Date().toISOString(),
              incidentId: snapshot.idEvenement,
              incidentLabel: snapshot.typeEvenement ?? 'Incident',
              description: `Statut mis à jour : ${snapshot.statutEvenement}`,
              source: 'live',
            })
          }
        })
        ajouterEntries(nouveaux)
      },
      onInterventions: (snapshots) => {
        if (!snapshots || snapshots.length === 0) return
        const nouveaux: TimelineEntry[] = []
        snapshots.forEach((snapshot) => {
          const key = `${snapshot.idEvenement}-${snapshot.idVehicule}`
          const precedent = interventionsRef.current.get(key)
          interventionsRef.current.set(key, snapshot)
          const statutTexte = snapshot.statusIntervention ?? ''
          if (!precedent) {
            nouveaux.push(buildInterventionEntry(snapshot, 'live'))
            return
          }
          const statutChange = precedent.statusIntervention !== statutTexte
          const finAjoutee =
            !precedent.dateFinIntervention && snapshot.dateFinIntervention
          if (finAjoutee) {
            nouveaux.push(buildInterventionEntry(snapshot, 'live', 'FIN'))
          } else if (statutChange) {
            nouveaux.push(buildInterventionEntry(snapshot, 'live'))
          }
        })
        ajouterEntries(nouveaux)
      },
      onVehicules: (snapshots) => {
        if (!snapshots || snapshots.length === 0) return
        snapshots.forEach((vehicule) => {
          vehiculesRef.current.set(vehicule.id, vehicule)
        })
      },
      onError: (err) => {
        console.warn('SSE Historique erreur', err)
      },
    })
    return () => es.close()
  }, [ajouterEntries, buildEvenementEntry, buildInterventionEntry])

  const entriesJour = useMemo(() => {
    const texte = rechercheTexte.trim().toLowerCase()
    return entries.filter(
      (entry) =>
        isSameDay(entry.at, selectedDay) &&
        filtreTypes.has(entry.kind) &&
        (texte.length === 0 ||
          entry.description.toLowerCase().includes(texte) ||
          (entry.incidentId ?? '').toLowerCase().includes(texte) ||
          (entry.incidentLabel ?? '').toLowerCase().includes(texte) ||
          (entry.vehicule ?? '').toLowerCase().includes(texte)),
    )
  }, [entries, filtreTypes, rechercheTexte, selectedDay])

  const entriesTriees = useMemo(
    () =>
      [...entriesJour].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
    [entriesJour],
  )

  const selectedKinds = useMemo(
    () => KINDS.filter((kind) => filtreTypes.has(kind)),
    [filtreTypes],
  )

  const toggleType = (kind: LogKind) => {
    setFiltreTypes((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) {
        next.delete(kind)
      } else {
        next.add(kind)
      }
      if (next.size === 0) {
        return new Set([kind])
      }
      return next
    })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        typeMenuRef.current &&
        !typeMenuRef.current.contains(event.target as Node)
      ) {
        setTypeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const exporterCsv = () => {
    const header = [
      'Horodatage',
      'Type',
      'Incident',
      'Description',
      'Source',
    ]
    const rows = entriesTriees.map((entry) => [
      entry.at,
      kindLabel(entry.kind),
      entry.incidentId ?? '',
      entry.description.replace(/\s+/g, ' ').trim(),
      entry.source,
    ])
    const contenu = [header, ...rows]
      .map((cols) =>
        cols
          .map((col) => `"${(col ?? '').toString().replace(/"/g, '""')}"`)
          .join(';'),
      )
      .join('\n')
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = `historique-${selectedDay}.csv`
    lien.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="history-page">
      <header className="history-header">
        <div>
          <p className="muted small">Journal d’audit & temps réel</p>
          <h2>Historique des événements</h2>
        </div>
        <div className="history-actions">
          <div className="live-dot">
            <span className="dot" />
            LIVE
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={exporterCsv}
            disabled={entriesTriees.length === 0}
          >
            Exporter CSV
          </button>
        </div>
      </header>

      <section className="history-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-input">
            <span aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Rechercher un incident, un véhicule ou un statut…"
              value={rechercheTexte}
              onChange={(e) => setRechercheTexte(e.target.value)}
            />
          </div>
        </div>
        <div className="toolbar-right">
          <div className="period-picker inline">
            <label className="muted small">Période</label>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            />
          </div>
          <div className="type-filter" ref={typeMenuRef}>
            <button
              type="button"
              className="multi-select-trigger"
              onClick={() => setTypeMenuOpen((open) => !open)}
            >
              <span className="muted small">Types</span>
              <div className="multi-badges">
                {filtreTypes.size === KINDS.length && (
                  <span className="chip active">Tout voir</span>
                )}
                {filtreTypes.size !== KINDS.length &&
                  selectedKinds.slice(0, 3).map((kind) => (
                    <span
                      key={kind}
                      className={`chip ${kind === 'CREATION' ? 'creation' : kind === 'DECISION' ? 'decision' : kind === 'AFFECTATION' ? 'affectation' : 'fin'} active`}
                    >
                      {kindLabel(kind)}
                    </span>
                  ))}
                {selectedKinds.length > 3 && (
                  <span className="chip muted">+{selectedKinds.length - 3}</span>
                )}
              </div>
              <span className="chevron">{typeMenuOpen ? '^' : 'v'}</span>
            </button>
            {typeMenuOpen && (
              <div className="multi-select-menu">
                <label className="multi-option">
                  <input
                    type="checkbox"
                    checked={filtreTypes.size === KINDS.length}
                    onChange={() => setFiltreTypes(new Set(KINDS))}
                  />
                  <span className="chip active">Tout voir</span>
                </label>
                {KINDS.map((kind) => (
                  <label key={kind} className="multi-option">
                    <input
                      type="checkbox"
                      checked={filtreTypes.has(kind)}
                      onChange={() => toggleType(kind)}
                    />
                    <span
                      className={`chip ${kind === 'CREATION' ? 'creation' : kind === 'DECISION' ? 'decision' : kind === 'AFFECTATION' ? 'affectation' : 'fin'} ${filtreTypes.has(kind) ? 'active' : ''}`}
                    >
                      {kindLabel(kind)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="history-table-card">
        <div className="table-header">
          <div>
            <p className="muted small">
              Affichage de {entriesTriees.length} événement
              {entriesTriees.length > 1 ? 's' : ''} sur la journée.
            </p>
          </div>
        </div>
        {etat === 'loading' && (
          <div className="table-placeholder">Chargement de l’historique…</div>
        )}
        {etat === 'error' && (
          <div className="table-placeholder erreur">{erreur}</div>
        )}
        {etat === 'ready' && entriesTriees.length === 0 && (
          <div className="table-placeholder">
            Aucun événement sur cette période ou avec ces filtres.
          </div>
        )}

        {etat === 'ready' && entriesTriees.length > 0 && (
          <div className="table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Heure</th>
                  <th>ID incident</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {entriesTriees.map((entry) => (
                  <tr key={entry.id}>
                    <td className="muted">{toHour(entry.at)}</td>
                    <td>
                      {entry.incidentId ? (
                        <span className="incident-id">#{entry.incidentId.slice(0, 8)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={`type-badge ${entry.kind.toLowerCase()}`}>
                        <span className="dot" />
                        {kindLabel(entry.kind)}
                      </span>
                    </td>
                    <td>
                      <div className="description-cell">
                        <p className="table-primary">{entry.description}</p>
                        <p className="muted small">
                          {entry.incidentLabel}
                          {entry.vehicule ? ` • ${entry.vehicule}` : ''}
                          {entry.badgeNote ? ` • ${entry.badgeNote}` : ''}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default HistoriquePage
