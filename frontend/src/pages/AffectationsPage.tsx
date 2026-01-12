import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './AffectationsPage.css'
import { getEvenementsSnapshots } from '../services/evenements'
import { getVehiculesSnapshots } from '../services/vehicules'
import { getInterventionsSnapshots } from '../services/interventions'
import type { EvenementApi } from '../models/evenement'
import Modal from '../components/Modal'
import { postValidationAffectation } from '../services/affectations'
import MapView, { type VueCarte } from '../components/MapView'
import {
  subscribeSdmisSse,
  type EvenementSnapshot,
  type InterventionSnapshot,
  type VehiculeSnapshot,
} from '../services/sse'

type VehiculePropose = {
  id: string
  nom: string
  caserne?: string
  statut: string
  distanceKm?: number
  dureeMin?: number
  proposition?: boolean
  latitude?: number
  longitude?: number
  plaque?: string
  statutBrut?: string
  equipements?: Array<{ nomEquipement: string; contenanceCourante: number }>
}

const interventionActive = (intervention: InterventionSnapshot) => {
  const statut = (intervention.statusIntervention ?? '').toLowerCase()
  if (
    statut.includes('annul') ||
    statut.includes('term') ||
    statut.includes('clos') ||
    intervention.dateFinIntervention
  ) {
    return false
  }
  return true
}

const interventionEnAttente = (intervention: InterventionSnapshot) =>
  (intervention.statusIntervention ?? '').toLowerCase().includes('attent')

const statutVehiculeDepuisTexte = (statut: string) => {
  const texte = (statut ?? '').toLowerCase()
  if (
    texte.includes('intervention') ||
    texte.includes('route') ||
    texte.includes('cours')
  ) {
    return 'En intervention'
  }
  if (texte.includes('dispon')) return 'Disponible'
  if (texte.includes('maint') || texte.includes('hors')) return 'Maintenance'
  return 'Indisponible'
}

const statutAffectable = (statut: string | undefined) => {
  const texte = (statut ?? '').toLowerCase()
  return texte.includes('déclar') || texte.includes('declar')
}

function AffectationsPage() {
  const [evenements, setEvenements] = useState<EvenementApi[]>([])
  const [vehicules, setVehicules] = useState<VehiculePropose[]>([])
  const [interventions, setInterventions] = useState<InterventionSnapshot[]>([])
  const [selectionEvtId, setSelectionEvtId] = useState<string | null>(null)
  const [selectionVehicules, setSelectionVehicules] = useState<Set<string>>(
    new Set(),
  )
  const [modalListe, setModalListe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const vehiculesRef = useRef<VehiculePropose[]>([])
  const interventionsRef = useRef<InterventionSnapshot[]>([])

  const appliquerPropositionsSelection = useCallback(
    (propositions: Set<string>) => {
      if (propositions.size === 0) return
      setSelectionVehicules(new Set(propositions))
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setErreur(null)
      try {
        const [evtApi, vehApi, interventionsApi] = await Promise.all([
          getEvenementsSnapshots(controller.signal),
          getVehiculesSnapshots(controller.signal),
          getInterventionsSnapshots(controller.signal),
        ])
        const evenementsDepuisSnapshots = evtApi.map((snapshot) => ({
          id: snapshot.idEvenement,
          description: snapshot.description,
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          idTypeEvenement: '',
          idStatut: '',
          idSeverite: '',
          nomTypeEvenement: snapshot.typeEvenement,
          nomStatut: snapshot.statutEvenement,
          nomSeverite: snapshot.severite,
          valeurEchelle: snapshot.echelleSeverite,
          nbVehiculesNecessaire: snapshot.nbVehiculesNecessaire ?? null,
        }))
        setEvenements(evenementsDepuisSnapshots)
        const interventionsInitial: InterventionSnapshot[] = interventionsApi.map(
          (intervention) => ({
            idEvenement: intervention.idEvenement,
            idVehicule: intervention.idVehicule,
            statusIntervention: intervention.statusIntervention,
            dateDebutIntervention: intervention.dateDebutIntervention,
            dateFinIntervention: intervention.dateFinIntervention,
            plaqueImmat: intervention.plaqueImmat,
          }),
        )
        const engages = new Set(
          interventionsInitial
            .filter(interventionActive)
            .map((intervention) => intervention.idVehicule),
        )
        const evenementsAffectables = evenementsDepuisSnapshots.filter((evt) =>
          statutAffectable(evt.nomStatut),
        )
        setSelectionEvtId(evenementsAffectables[0]?.id ?? null)
        const views = vehApi.map((vehicule) => ({
          id: vehicule.id,
          nom: `Véhicule ${vehicule.id.slice(0, 6)}`,
          caserne: vehicule.caserne ?? '',
          statut: engages.has(vehicule.id)
            ? 'En intervention'
            : statutVehiculeDepuisTexte(vehicule.statut),
          proposition: false,
          latitude: vehicule.latitude,
          longitude: vehicule.longitude,
          plaque: vehicule.plaqueImmat,
          statutBrut: vehicule.statut,
          equipements:
            vehicule.equipements?.map((eq) => ({
              nomEquipement: eq.nomEquipement,
              contenanceCourante: eq.contenanceCourante,
            })) ?? [],
        }))
        setVehicules(views)
        setInterventions(interventionsInitial)
        vehiculesRef.current = views
        interventionsRef.current = interventionsInitial
      } catch (error) {
        if (controller.signal.aborted) return
        setErreur(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les affectations',
        )
      }
    }
    void charger()
    return () => controller.abort()
  }, [])

  const appliquerSnapshotsEvenements = useCallback((snapshots: EvenementSnapshot[]) => {
    if (snapshots.length === 0) return
    setEvenements((prev) => {
      const map = new Map(prev.map((evt) => [evt.id, evt]))
      snapshots.forEach((snapshot) => {
        const courant = map.get(snapshot.idEvenement)
        map.set(snapshot.idEvenement, {
          ...courant,
          id: snapshot.idEvenement,
          description: snapshot.description,
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          idTypeEvenement: courant?.idTypeEvenement ?? '',
          idStatut: courant?.idStatut ?? '',
          idSeverite: courant?.idSeverite ?? '',
          nomTypeEvenement: snapshot.typeEvenement,
          nomStatut: snapshot.statutEvenement,
          nomSeverite: snapshot.severite,
          valeurEchelle: snapshot.echelleSeverite,
          nbVehiculesNecessaire:
            snapshot.nbVehiculesNecessaire ??
            courant?.nbVehiculesNecessaire ??
            null,
        })
      })
      const next = Array.from(map.values())
      const evenementsProposables = next.filter((evt) =>
        statutAffectable(evt.nomStatut),
      )
      setSelectionEvtId((prev) =>
        prev && evenementsProposables.some((evt) => evt.id === prev)
          ? prev
          : evenementsProposables[0]?.id ?? null,
      )
      return next
    })
  }, [])

  const appliquerSnapshotsInterventions = useCallback(
    (snapshots: InterventionSnapshot[]) => {
      if (snapshots.length === 0) return
      const map = new Map(
        interventionsRef.current.map((intervention) => [
          `${intervention.idEvenement}-${intervention.idVehicule}`,
          intervention,
        ]),
      )
      snapshots.forEach((intervention) => {
        map.set(
          `${intervention.idEvenement}-${intervention.idVehicule}`,
          intervention,
        )
      })
      const next = Array.from(map.values())
      interventionsRef.current = next
      setInterventions(next)
      const engagements = new Set(
        next
          .filter(interventionActive)
          .map((intervention) => intervention.idVehicule),
      )
      setVehicules((prev) => {
        const updated = prev.map((vehicule) => {
          const statutActuel = vehicule.statut
          const statut = engagements.has(vehicule.id)
            ? 'En intervention'
            : statutActuel === 'Maintenance' || statutActuel === 'Indisponible'
              ? statutActuel
              : 'Disponible'
          return { ...vehicule, statut }
        })
        vehiculesRef.current = updated
        return updated
      })
      if (selectionEvtId) {
        const propositionsMaj = new Set(
          next
            .filter(
              (intervention) =>
                intervention.idEvenement === selectionEvtId &&
                interventionEnAttente(intervention),
            )
            .map((intervention) => intervention.idVehicule),
        )
        appliquerPropositionsSelection(propositionsMaj)
      }
    },
    [appliquerPropositionsSelection, selectionEvtId],
  )

  const appliquerSnapshotsVehicules = useCallback(
    (snapshots: VehiculeSnapshot[]) => {
      if (snapshots.length === 0) return
      const engagements = new Set(
        interventionsRef.current
          .filter(interventionActive)
          .map((intervention) => intervention.idVehicule),
      )
      setVehicules((prev) => {
        const map = new Map(prev.map((vehicule) => [vehicule.id, vehicule]))
        snapshots.forEach((vehicule) => {
          const precedent = map.get(vehicule.id)
          map.set(vehicule.id, {
            ...precedent,
            id: vehicule.id,
            nom: precedent?.nom ?? `Véhicule ${vehicule.id.slice(0, 6)}`,
            statut: engagements.has(vehicule.id)
              ? 'En intervention'
              : statutVehiculeDepuisTexte(vehicule.statut),
            proposition: precedent?.proposition ?? false,
            latitude: vehicule.latitude,
            longitude: vehicule.longitude,
            caserne: precedent?.caserne,
            plaque: vehicule.plaqueImmat ?? precedent?.plaque,
            statutBrut: vehicule.statut ?? precedent?.statutBrut,
            equipements:
              vehicule.equipements?.map((eq) => ({
                nomEquipement: eq.nomEquipement,
                contenanceCourante: eq.contenanceCourante,
              })) ?? precedent?.equipements,
          })
        })
        const updated = Array.from(map.values()).map((vehicule) =>
          engagements.has(vehicule.id)
            ? { ...vehicule, statut: 'En intervention' }
            : vehicule,
        )
        vehiculesRef.current = updated
        return updated
      })
    },
    [],
  )

  useEffect(() => {
    const es = subscribeSdmisSse({
      onEvenements: appliquerSnapshotsEvenements,
      onInterventions: appliquerSnapshotsInterventions,
      onVehicules: appliquerSnapshotsVehicules,
      onError: (err) => console.error('SSE affectations', err),
    })
    return () => es.close()
  }, [
    appliquerSnapshotsEvenements,
    appliquerSnapshotsInterventions,
    appliquerSnapshotsVehicules,
  ])

  const evenementSelectionne = useMemo(
    () => evenements.find((e) => e.id === selectionEvtId) ?? null,
    [evenements, selectionEvtId],
  )

  const evenementsAvecPropositions = useMemo(() => {
    return evenements.filter((evt) => statutAffectable(evt.nomStatut))
  }, [evenements])

  const propositionsPourEvenement = useMemo(() => {
    if (!selectionEvtId) return new Set<string>()
    return new Set(
      interventions
        .filter(
          (intervention) =>
            intervention.idEvenement === selectionEvtId &&
            interventionEnAttente(intervention),
        )
        .map((intervention) => intervention.idVehicule),
    )
  }, [interventions, selectionEvtId])

  const vueMiniCarte = useMemo<VueCarte>(
    () => ({
      latitude: evenementSelectionne?.latitude ?? 45.75,
      longitude: evenementSelectionne?.longitude ?? 4.85,
      zoom: evenementSelectionne ? 14 : 12,
      bearing: 0,
      pitch: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    }),
    [evenementSelectionne],
  )

  const vehiculesDisponibles = useMemo(
    () =>
      vehicules
        .map((v) => ({
          ...v,
          proposition: propositionsPourEvenement.has(v.id),
        }))
        .filter((v) => v.proposition || v.statut.toLowerCase().includes('dispo'))
        .sort((a, b) => {
          if (a.proposition && !b.proposition) return -1
          if (!a.proposition && b.proposition) return 1
          return a.nom.localeCompare(b.nom)
        }),
    [vehicules, propositionsPourEvenement],
  )

  const toggleVehicule = (id: string) => {
    setSelectionVehicules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const valider = async () => {
    if (!selectionEvtId) return
    setMessage(null)
    setErreur(null)
    try {
      await postValidationAffectation({
        id_evenement: selectionEvtId,
        vehicules: Array.from(selectionVehicules),
      })
      setMessage('Affectation envoyée')
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : 'Échec de l’envoi de l’affectation',
      )
    }
  }

  return (
    <div className="affectations-page">
      <header className="affectations-header">
        <div>
          <p className="muted small">Affectations & Décisions</p>
          <h2>Affectations</h2>
        </div>
        <div className="status-chip">Système connecté</div>
      </header>

      <div className="affectations-grid">
        <section className="aff-col incident">
          <div className={`mini-map ${evenementSelectionne ? '' : 'empty'}`}>
            {evenementSelectionne ? (
              <MapView
                evenements={[
                  {
                    id: evenementSelectionne.id,
                    titre: evenementSelectionne.nomTypeEvenement,
                    description: evenementSelectionne.description,
                    statut: 'EN_COURS',
                    gravite: 'CRITIQUE',
                    latitude: evenementSelectionne.latitude,
                    longitude: evenementSelectionne.longitude,
                    derniereMiseAJour: new Date().toISOString(),
                    statutLabel: evenementSelectionne.nomStatut,
                  },
                ]}
                ressources={[]}
                evenementSelectionneId={evenementSelectionne.id}
                popupEvenementId={evenementSelectionne.id}
                popupRessourceId={null}
                onSelectEvenement={() => undefined}
                onMove={() => undefined}
                vue={vueMiniCarte}
                interactionEnabled={false}
                onSelectRessource={() => undefined}
                onClosePopups={() => undefined}
                navigationEnabled={false}
                compactMarkers
              />
            ) : (
              <div className="mini-map-placeholder">
                <p className="muted small">
                  Aucun événement en attente d’affectation
                </p>
              </div>
            )}
          </div>
          <p className="muted small">Evenement sélectionné</p>
          {evenementSelectionne ? (
            <>
              <h3>{evenementSelectionne.nomTypeEvenement}</h3>
              <p className="muted">{evenementSelectionne.description}</p>
              <p className="muted small">
                Localisation :{' '}
                {evenementSelectionne.latitude.toFixed(4)},{' '}
                {evenementSelectionne.longitude.toFixed(4)}
              </p>
              <p className="muted small">
                Statut : {evenementSelectionne.nomStatut}
              </p>
              <p className="muted small gravite-label">
                Gravité : {evenementSelectionne.nomSeverite}
              </p>
            </>
          ) : (
            <p className="muted">Aucun événement sélectionné</p>
          )}
          <label className="select-evt">
            Choisir un événement
            <select
              value={selectionEvtId ?? ''}
              onChange={(e) => {
                const nextId = e.target.value
                if (!nextId) {
                  setSelectionEvtId(null)
                  setSelectionVehicules(new Set())
                  return
                }
                setSelectionEvtId(nextId)
                const propositions = new Set(
                  interventions
                    .filter(
                      (intervention) =>
                        intervention.idEvenement === nextId &&
                        interventionActive(intervention),
                    )
                    .map((intervention) => intervention.idVehicule),
                )
                appliquerPropositionsSelection(propositions)
              }}
            >
              {evenementsAvecPropositions.length === 0 && (
                <option value="">Aucun événement en attente</option>
              )}
              {evenementsAvecPropositions.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nomTypeEvenement} ({evt.nomStatut})
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="aff-col ressources">
          <div className="aff-col-header">
          <p className="muted small">Ressources proposées</p>
          <button className="link" type="button" onClick={() => setModalListe(true)}>
            Voir toutes les unités
          </button>
        </div>
          <div className="liste-vehicules">
            {vehiculesDisponibles.map((vehicule) => (
              <button
                key={vehicule.id}
                type="button"
                className={`vehicule-card ${
                  selectionVehicules.has(vehicule.id) ? 'selected' : ''
                }`}
                onClick={() => toggleVehicule(vehicule.id)}
              >
                <div className="vehicule-top">
                  <h4>Véhicule {vehicule.plaque ?? vehicule.nom}</h4>
                  <span className="badge small">
                    {vehicule.proposition ? 'Proposition' : 'Disponible'}
                  </span>
                </div>
                <p className="muted small">
                  Caserne : {vehicule.caserne || '—'}
                </p>
                <p className="muted small">
                  {vehicule.plaque ? `Plaque : ${vehicule.plaque}` : 'Plaque : —'}
                </p>
                {vehicule.equipements && vehicule.equipements.length > 0 && (
                  <p className="muted small">
                    Équipements :{' '}
                    {vehicule.equipements
                      .map(
                        (eq) =>
                          `${eq.nomEquipement ?? 'Équipement'} (${eq.contenanceCourante ?? 0})`,
                      )
                      .join(', ')}
                  </p>
                )}
                {vehicule.proposition && (
                  <p className="proposition">Proposition moteur</p>
                )}
              </button>
            ))}
          {vehiculesDisponibles.length === 0 && (
            <p className="muted small">Aucune ressource disponible</p>
          )}
        </div>
      </section>

      <section className="aff-col resume">
        <p className="muted small">Résumé de la décision</p>
        <div className="resume-card">
          <p className="muted small">
            Affectation de {selectionVehicules.size} véhicule(s)
          </p>
          {evenementSelectionne && (
            <p className="muted small">
              Événement : {evenementSelectionne.nomTypeEvenement}
            </p>
          )}
          {selectionVehicules.size > 0 && (
            <ul className="muted small">
              {Array.from(selectionVehicules).map((id) => {
                const vehicule = vehicules.find((v) => v.id === id)
                return (
                  <li key={id}>
                    {vehicule?.nom ?? id.slice(0, 8)}
                    {vehicule?.plaque ? ` • ${vehicule.plaque}` : ''}
                  </li>
                )
              })}
            </ul>
          )}
          {erreur && <p className="erreur">{erreur}</p>}
          {message && <p className="success">{message}</p>}
          <button
            type="button"
            className={`primary ${!selectionEvtId || selectionVehicules.size === 0 ? 'disabled' : ''}`}
            onClick={valider}
            disabled={!selectionEvtId || selectionVehicules.size === 0}
          >
            Valider l’affectation
          </button>
        </div>
      </section>
      </div>

      {modalListe && (
        <Modal titre="Toutes les unités" onClose={() => setModalListe(false)}>
          <div className="liste-modal scrollable modal-vehicules">
            {[...vehicules]
              .sort((a, b) => {
                const rang = (v: VehiculePropose) => {
                  if (v.proposition) return 0
                  const statut = (v.statut ?? '').toLowerCase()
                  if (statut.includes('dispon')) return 1
                  if (statut.includes('intervention')) return 2
                  return 3
                }
                const diff = rang(a) - rang(b)
                if (diff !== 0) return diff
                return (a.nom ?? '').localeCompare(b.nom ?? '')
              })
              .map((v) => (
              <div key={v.id} className="vehicule-row">
                <div className="vehicule-row-info">
                  <strong>Véhicule {v.plaque ?? v.nom}</strong>
                  <p className="muted small">Caserne : {v.caserne || '—'}</p>
                  <p className="muted small">
                    Équipements :{' '}
                    {v.equipements && v.equipements.length > 0
                      ? v.equipements
                          .map(
                            (eq) =>
                              `${eq.nomEquipement ?? 'Équipement'} (${eq.contenanceCourante ?? 0})`,
                          )
                          .join(', ')
                      : '—'}
                  </p>
                </div>
                <span className="status-pill">
                  {v.proposition ? 'En proposition' : v.statut || '—'}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AffectationsPage
