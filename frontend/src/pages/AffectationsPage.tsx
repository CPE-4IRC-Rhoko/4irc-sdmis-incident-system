import { useEffect, useMemo, useState } from 'react'
import './AffectationsPage.css'
import { getEvenements } from '../services/evenements'
import { getVehiculesOperationnels } from '../services/vehicules'
import { getInterventions } from '../services/interventions'
import type { EvenementApi } from '../models/evenement'
import Modal from '../components/Modal'
import { postValidationAffectation } from '../services/affectations'
import MapView, { type VueCarte } from '../components/MapView'

type VehiculePropose = {
  id: string
  nom: string
  caserne?: string
  statut: string
  distanceKm?: number
  dureeMin?: number
  proposition: boolean
  latitude?: number
  longitude?: number
}

function AffectationsPage() {
  const [evenements, setEvenements] = useState<EvenementApi[]>([])
  const [vehicules, setVehicules] = useState<VehiculePropose[]>([])
  const [selectionEvtId, setSelectionEvtId] = useState<string | null>(null)
  const [selectionVehicules, setSelectionVehicules] = useState<Set<string>>(
    new Set(),
  )
  const [modalListe, setModalListe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [vueMiniCarte, setVueMiniCarte] = useState<VueCarte>({
    latitude: 45.75,
    longitude: 4.85,
    zoom: 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  })

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setErreur(null)
      try {
        const [evtApi, vehApi, interventionsApi] = await Promise.all([
          getEvenements(controller.signal),
          getVehiculesOperationnels(controller.signal),
          getInterventions(controller.signal),
        ])
        setEvenements(evtApi)
        const engages = new Set(
          interventionsApi.map((intervention) => intervention.idVehicule),
        )
        const propositions = vehApi.slice(0, 3).map((v) => v.id)
        setSelectionEvtId(evtApi[0]?.id ?? null)
        setSelectionVehicules(new Set(propositions))
        setVehicules(
          vehApi.map((vehicule) => ({
            id: vehicule.id,
            nom: `Véhicule ${vehicule.id.slice(0, 6)}`,
            caserne: vehicule.idStatut ? '' : '',
            statut: engages.has(vehicule.id)
              ? 'En intervention'
              : vehicule.operationnel
                ? 'Disponible'
                : 'Indisponible',
            proposition: propositions.includes(vehicule.id),
            latitude: vehicule.latitude,
            longitude: vehicule.longitude,
          })),
        )
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

  const evenementSelectionne = useMemo(
    () => evenements.find((e) => e.id === selectionEvtId) ?? null,
    [evenements, selectionEvtId],
  )

  const vehiculesDisponibles = useMemo(
    () => vehicules.filter((v) => v.statut.toLowerCase().includes('dispo')),
    [vehicules],
  )

  useEffect(() => {
    if (!evenementSelectionne) return
    setVueMiniCarte((prev) => ({
      ...prev,
      latitude: evenementSelectionne.latitude,
      longitude: evenementSelectionne.longitude,
      zoom: 14,
    }))
  }, [evenementSelectionne])

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
          <div className="mini-map">
            {evenementSelectionne && (
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
                onMove={setVueMiniCarte}
                vue={vueMiniCarte}
                interactionEnabled={false}
                onSelectRessource={() => undefined}
                onClosePopups={() => undefined}
                navigationEnabled={false}
                compactMarkers
              />
            )}
          </div>
          <p className="muted small">Incident sélectionné</p>
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
            <p className="muted">Aucun incident sélectionné</p>
          )}
          <label className="select-evt">
            Choisir un événement
            <select
              value={selectionEvtId ?? ''}
              onChange={(e) => setSelectionEvtId(e.target.value)}
            >
              {evenements.map((evt) => (
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
                  <h4>{vehicule.nom}</h4>
                  <span className="badge small">Disponible</span>
                </div>
                <p className="muted small">
                  Caserne : {vehicule.caserne || '—'}
                </p>
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
            {erreur && <p className="erreur">{erreur}</p>}
            {message && <p className="success">{message}</p>}
            <button
              type="button"
              className="primary"
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
          <div className="liste-modal">
            {vehicules.map((v) => (
              <div key={v.id} className="vehicule-row">
                <div>
                  <strong>{v.nom}</strong>
                  <p className="muted small">Statut : {v.statut}</p>
                </div>
                <button
                  type="button"
                  className={`small-btn ${
                    selectionVehicules.has(v.id) ? 'selected' : ''
                  }`}
                  onClick={() => toggleVehicule(v.id)}
                >
                  {selectionVehicules.has(v.id) ? 'Sélectionné' : 'Choisir'}
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AffectationsPage
