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

const shiftDay = (day: string, delta: number) => {
  const base = new Date(`${day}T00:00:00`)
  base.setDate(base.getDate() + delta)
  return dateInputValue(base)
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

function HistoriquePage() {
  const [etat, setEtat] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(dateInputValue(new Date()))
  const [plageHeures, setPlageHeures] = useState<6 | 12 | 24>(12)
  const [filtreTypes, setFiltreTypes] = useState<Set<LogKind>>(
    () => new Set(KINDS),
  )
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [rechercheTexte, setRechercheTexte] = useState('')

  const evenementsRef = useRef<Map<string, EvenementSnapshot>>(new Map())
  const interventionsRef = useRef<Map<string, InterventionSnapshot>>(new Map())
  const vehiculesRef = useRef<Map<string, VehiculeSnapshot>>(new Map())
  const fingerprintsRef = useRef<Set<string>>(new Set())

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

  const totalJour = useMemo(
    () =>
      entries.filter((entry) => isSameDay(entry.at, selectedDay)).length,
    [entries, selectedDay],
  )

  const totalHier = useMemo(() => {
    const veille = shiftDay(selectedDay, -1)
    return entries.filter((entry) => isSameDay(entry.at, veille)).length
  }, [entries, selectedDay])

  const variation = useMemo(() => {
    if (totalHier === 0) return null
    return Math.round(((totalJour - totalHier) / totalHier) * 100)
  }, [totalHier, totalJour])

  const buckets = useMemo(() => {
    const today = dateInputValue(new Date())
    const now = new Date()
    const endHour = selectedDay === today ? now.getHours() : 23
    const startHour = Math.max(0, endHour - plageHeures + 1)
    const serie: Array<{ hour: number; count: number; current: boolean }> = []
    for (let hour = startHour; hour <= endHour; hour += 1) {
      const count = entriesJour.filter(
        (entry) => new Date(entry.at).getHours() === hour,
      ).length
      serie.push({
        hour,
        count,
        current: selectedDay === today && hour === now.getHours(),
      })
    }
    const max = serie.reduce((acc, cur) => Math.max(acc, cur.count), 0)
    return serie.map((point) => ({
      ...point,
      ratio: max === 0 ? 0 : point.count / max,
    }))
  }, [entriesJour, plageHeures, selectedDay])

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

      <section className="history-activity-card">
        <div className="activity-metric">
          <p className="muted small">Volume d’activité</p>
          <div className="activity-count">
            <h3>{totalJour}</h3>
            {variation !== null && (
              <span className={variation >= 0 ? 'trend up' : 'trend down'}>
                {variation > 0 ? '+' : ''}
                {variation}% vs veille
              </span>
            )}
          </div>
        </div>
        <div className="activity-chart">
          <div className="chart-bars">
            {buckets.map((bucket) => (
              <div key={bucket.hour} className="chart-bar">
                <div
                  className={`bar ${bucket.current ? 'active' : ''}`}
                  style={{ height: `${Math.max(bucket.ratio * 100, 6)}%` }}
                  title={`${bucket.count} événements à ${bucket.hour
                    .toString()
                    .padStart(2, '0')}h`}
                />
                <span className="bar-label">
                  {bucket.hour.toString().padStart(2, '0')}h
                </span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <div className="toggle-group">
              {[6, 12, 24].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={plageHeures === value ? 'active' : ''}
                  onClick={() => setPlageHeures(value as 6 | 12 | 24)}
                >
                  {value}h
                </button>
              ))}
            </div>
            <p className="muted small">
              Dernières {plageHeures} heures sur la journée sélectionnée.
            </p>
          </div>
        </div>
      </section>

      <section className="history-toolbar">
        <div className="period-picker">
          <label className="muted small">Période</label>
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          />
        </div>
        <div className="toolbar-input">
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un incident, un véhicule ou un statut…"
            value={rechercheTexte}
            onChange={(e) => setRechercheTexte(e.target.value)}
          />
        </div>
        <div className="chips">
          <button
            type="button"
            className={filtreTypes.size === KINDS.length ? 'chip active' : 'chip'}
            onClick={() => setFiltreTypes(new Set(KINDS))}
          >
            Tout voir
          </button>
          <button
            type="button"
            className={`chip ${filtreTypes.has('CREATION') ? 'active creation' : ''}`}
            onClick={() => toggleType('CREATION')}
          >
            Création
          </button>
          <button
            type="button"
            className={`chip ${filtreTypes.has('DECISION') ? 'active decision' : ''}`}
            onClick={() => toggleType('DECISION')}
          >
            Décision
          </button>
          <button
            type="button"
            className={`chip ${filtreTypes.has('AFFECTATION') ? 'active affectation' : ''}`}
            onClick={() => toggleType('AFFECTATION')}
          >
            Affectation
          </button>
          <button
            type="button"
            className={`chip ${filtreTypes.has('FIN') ? 'active fin' : ''}`}
            onClick={() => toggleType('FIN')}
          >
            Fin d’intervention
          </button>
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
        )}
      </section>
    </div>
  )
}

export default HistoriquePage
