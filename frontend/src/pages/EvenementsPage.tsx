import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal'
import './EvenementsPage.css'
import '../components/IncidentForm.css'
import {
  createEvenement,
  getEvenements,
  getSeverites,
  getTypesEvenement,
} from '../services/evenements'
import type {
  EvenementApi,
  EvenementCreatePayload,
  SeveriteReference,
  TypeEvenementReference,
} from '../models/evenement'

type FormMode = 'creation' | 'edition'

interface FormState extends EvenementCreatePayload {
  id?: string
}

const niveauSeverite = (
  libelle: string,
): 'critique' | 'moyenne' | 'faible' => {
  const texte = libelle.toLowerCase()
  if (
    texte.includes('crit') ||
    texte.includes('grave') ||
    texte.includes('haut')
  ) {
    return 'critique'
  }
  if (texte.includes('moy') || texte.includes('mod')) return 'moyenne'
  return 'faible'
}

const poidsSeverite = (libelle: string) => {
  const niveau = niveauSeverite(libelle)
  if (niveau === 'critique') return 3
  if (niveau === 'moyenne') return 2
  return 1
}

const classSeverite = (libelle: string) =>
  `badge severite-${niveauSeverite(libelle)}`

const classStatut = (statut: string) => {
  const texte = statut.toLowerCase()
  if (texte.includes('cours')) return 'statut-en-cours'
  if (
    texte.includes('attente') ||
    texte.includes('declare') ||
    texte.includes('décla')
  ) {
    return 'statut-attente'
  }
  if (
    texte.includes('résol') ||
    texte.includes('resol') ||
    texte.includes('clos') ||
    texte.includes('clôt')
  ) {
    return 'statut-resolu'
  }
  return 'statut-neutre'
}

const formatCoord = (value: number) => value.toFixed(4)

const localisationLisible = (evt: EvenementApi) =>
  `${formatCoord(evt.latitude)}, ${formatCoord(evt.longitude)}`

function EvenementsPage() {
  const [evenements, setEvenements] = useState<EvenementApi[]>([])
  const [severites, setSeverites] = useState<SeveriteReference[]>([])
  const [types, setTypes] = useState<TypeEvenementReference[]>([])
  const [etat, setEtat] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtreTexte, setFiltreTexte] = useState('')
  const [filtreSeverite, setFiltreSeverite] = useState<string>('toutes')
  const [filtreStatut, setFiltreStatut] = useState<string>('tous')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const statutsDisponibles = useMemo(() => {
    const map = new Map<string, string>()
    evenements.forEach((evt) => {
      map.set(evt.idStatut, evt.nomStatut)
    })
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }))
  }, [evenements])

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setEtat('loading')
      setErreur(null)
      try {
        const [evtApi, severitesApi, typesApi] = await Promise.all([
          getEvenements(controller.signal),
          getSeverites(controller.signal),
          getTypesEvenement(controller.signal),
        ])
        setEvenements(evtApi)
        setSeverites(severitesApi)
        setTypes(typesApi)
        setEtat('ready')
        if (evtApi.length > 0) {
          setSelectedId((prev) =>
            prev && evtApi.some((evt) => evt.id === prev)
              ? prev
              : evtApi[0].id,
          )
        } else {
          setSelectedId(null)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setErreur(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les événements',
        )
        setEtat('error')
      }
    }

    void charger()
    return () => controller.abort()
  }, [refreshKey])

  const evenementsFiltres = useMemo(() => {
    const recherche = filtreTexte.trim().toLowerCase()
    return [...evenements]
      .filter((evt) => {
        const correspondTexte =
          recherche.length === 0 ||
          [
            evt.id,
            evt.description,
            evt.nomTypeEvenement,
            evt.nomStatut,
            evt.nomSeverite,
            evt.valeurEchelle,
          ].some((champ) => champ?.toLowerCase().includes(recherche))
        const correspondSeverite =
          filtreSeverite === 'toutes' || evt.idSeverite === filtreSeverite
        const correspondStatut =
          filtreStatut === 'tous' || evt.idStatut === filtreStatut
        return correspondTexte && correspondSeverite && correspondStatut
      })
      .sort(
        (a, b) => poidsSeverite(b.nomSeverite) - poidsSeverite(a.nomSeverite),
      )
  }, [evenements, filtreTexte, filtreSeverite, filtreStatut])

  useEffect(() => {
    if (evenementsFiltres.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId) {
      setSelectedId(evenementsFiltres[0].id)
      return
    }
    const selectionVisible = evenementsFiltres.some(
      (evt) => evt.id === selectedId,
    )
    if (!selectionVisible) {
      setSelectedId(evenementsFiltres[0].id)
    }
  }, [evenementsFiltres, selectedId])

  const selection = useMemo(
    () => evenements.find((evt) => evt.id === selectedId) ?? null,
    [evenements, selectedId],
  )

  const metriques = useMemo(() => {
    const severiteCritique = evenements.filter(
      (evt) => niveauSeverite(evt.nomSeverite) === 'critique',
    ).length
    const besoinsRessources = evenements.filter(
      (evt) => (evt.nbVehiculesNecessaire ?? 0) > 0,
    ).length
    const clotures = evenements.filter((evt) => {
      const statut = evt.nomStatut.toLowerCase()
      return (
        statut.includes('résol') ||
        statut.includes('resol') ||
        statut.includes('clos') ||
        statut.includes('clôt')
      )
    }).length
    return {
      total: evenements.length,
      critiques: severiteCritique,
      besoinsRessources,
      clotures,
    }
  }, [evenements])

  const remettreAZeroForm = () => {
    setFormMode(null)
    setFormState(null)
    setFormError(null)
    setFormLoading(false)
  }

  const ouvrirCreation = () => {
    setFormMode('creation')
    setFormError(null)
    setFormState({
      description: '',
      latitude: selection?.latitude ?? 45.7578,
      longitude: selection?.longitude ?? 4.8351,
      idTypeEvenement: types[0]?.id ?? '',
      idSeverite: severites[0]?.id ?? '',
      idStatut: statutsDisponibles[0]?.id ?? '',
    })
  }

  const ouvrirEdition = (evt: EvenementApi) => {
    setFormMode('edition')
    setFormError(null)
    setFormState({
      id: evt.id,
      description: evt.description,
      latitude: evt.latitude,
      longitude: evt.longitude,
      idTypeEvenement: evt.idTypeEvenement,
      idSeverite: evt.idSeverite,
      idStatut: evt.idStatut,
    })
  }

  const mettreAJourForm = (champ: keyof FormState, valeur: string | number) => {
    setFormState((prev) =>
      prev
        ? {
            ...prev,
            [champ]: valeur,
          }
        : prev,
    )
  }

  const soumettreFormulaire = async () => {
    if (!formState || !formMode) return
    setFormError(null)

    if (!formState.idStatut) {
      setFormError(
        'Choisissez un statut (aucune référence de statut encore fournie par l’API).',
      )
      return
    }

    if (formMode === 'edition') {
      if (!formState.id) {
        setFormError('Impossible de modifier : identifiant manquant.')
        return
      }
      const severiteRef = severites.find(
        (sev) => sev.id === formState.idSeverite,
      )
      const typeRef = types.find((type) => type.id === formState.idTypeEvenement)
      const statutRef = statutsDisponibles.find(
        (statut) => statut.id === formState.idStatut,
      )

      setEvenements((prev) =>
        prev.map((evt) =>
          evt.id === formState.id
            ? {
                ...evt,
                description: formState.description,
                latitude: Number(formState.latitude),
                longitude: Number(formState.longitude),
                idTypeEvenement: formState.idTypeEvenement,
                idSeverite: formState.idSeverite,
                idStatut: formState.idStatut,
                nomTypeEvenement:
                  typeRef?.nomTypeEvenement ?? evt.nomTypeEvenement,
                nomSeverite: severiteRef?.nomSeverite ?? evt.nomSeverite,
                nomStatut: statutRef?.nom ?? evt.nomStatut,
                nbVehiculesNecessaire:
                  severiteRef?.nbVehiculesNecessaire ?? evt.nbVehiculesNecessaire,
                valeurEchelle: severiteRef?.valeurEchelle ?? evt.valeurEchelle,
              }
            : evt,
        ),
      )
      remettreAZeroForm()
      return
    }

    try {
      setFormLoading(true)
      const payload: EvenementCreatePayload = {
        description: formState.description,
        latitude: Number(formState.latitude),
        longitude: Number(formState.longitude),
        idTypeEvenement: formState.idTypeEvenement,
        idStatut: formState.idStatut,
        idSeverite: formState.idSeverite,
      }
      const created = await createEvenement(payload)
      setEvenements((prev) => [created, ...prev])
      setSelectedId(created.id)
      remettreAZeroForm()
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Échec de la création côté API.',
      )
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="evenements-page">
      <header className="events-header">
        <div>
          <p className="muted small">Supervision en temps réel</p>
          <h2>Gestion des événements</h2>
          <p className="muted">
            Tableau de suivi et première connexion API (GET /api/evenements).
          </p>
        </div>
        <div className="events-actions">
          <button className="ghost-button" type="button">
            Demander une décision
          </button>
          <button
            className="primary"
            type="button"
            onClick={ouvrirCreation}
            disabled={etat !== 'ready'}
            title={
              severites.length === 0 || types.length === 0
                ? 'Référentiels incomplets pour pré-remplir le formulaire'
                : undefined
            }
          >
            Créer un événement
          </button>
        </div>
      </header>

      <div className="events-metrics">
        <div className="metric-card">
          <p className="muted small">Événements actifs</p>
          <h3>{metriques.total}</h3>
          <p className="muted">Source : API</p>
        </div>
        <div className="metric-card severe">
          <p className="muted small">Gravité critique</p>
          <h3>{metriques.critiques}</h3>
          <p className="muted">Inclut les niveaux "Grave/Critique"</p>
        </div>
        <div className="metric-card warning">
          <p className="muted small">Besoins en ressources</p>
          <h3>{metriques.besoinsRessources}</h3>
          <p className="muted">Nb véhicules requis renseignés</p>
        </div>
        <div className="metric-card success">
          <p className="muted small">Clôturés / résolus</p>
          <h3>{metriques.clotures}</h3>
          <p className="muted">Basé sur le nom du statut</p>
        </div>
      </div>

      <div className="events-toolbar">
        <div className="toolbar-input">
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par ID, type, statut..."
            value={filtreTexte}
            onChange={(e) => setFiltreTexte(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <label>
            Gravité
            <select
              value={filtreSeverite}
              onChange={(e) => setFiltreSeverite(e.target.value)}
            >
              <option value="toutes">Toutes</option>
              {severites.map((sev) => (
                <option key={sev.id} value={sev.id}>
                  {sev.nomSeverite} ({sev.valeurEchelle})
                </option>
              ))}
            </select>
          </label>
          <label>
            Statut
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
            >
              <option value="tous">Tous</option>
              {statutsDisponibles.map((statut) => (
                <option key={statut.id} value={statut.id}>
                  {statut.nom}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            Recharger
          </button>
        </div>
      </div>

      <div className="events-grid">
        <div className="events-table-card">
          <div className="table-header">
            <div>
              <p className="muted small">
                {etat === 'loading'
                  ? 'Chargement en cours...'
                  : `${evenementsFiltres.length} résultat(s)`}
              </p>
              <h3>Liste des événements</h3>
            </div>
            <div className="table-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setFiltreTexte('')}
              >
                Effacer la recherche
              </button>
            </div>
          </div>

          {etat === 'loading' && (
            <div className="table-placeholder">Chargement des données...</div>
          )}

          {etat === 'error' && (
            <div className="table-placeholder erreur">
              <p>{erreur}</p>
              <button
                type="button"
                className="primary"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                Réessayer
              </button>
            </div>
          )}

          {etat === 'ready' && evenementsFiltres.length === 0 && (
            <div className="table-placeholder">
              Aucun événement ne correspond aux filtres.
            </div>
          )}

          {etat === 'ready' && evenementsFiltres.length > 0 && (
            <table className="events-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Gravité</th>
                  <th>Localisation</th>
                  <th>Échelle</th>
                  <th>Ressources</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {evenementsFiltres.map((evt) => (
                  <tr
                    key={evt.id}
                    className={selectedId === evt.id ? 'row-active' : ''}
                    onClick={() => setSelectedId(evt.id)}
                  >
                    <td className="id-cell">#{evt.id.slice(0, 8)}</td>
                    <td>
                      <div className="table-primary">{evt.nomTypeEvenement}</div>
                      <p className="muted small">{evt.description}</p>
                    </td>
                    <td>
                      <span className={classSeverite(evt.nomSeverite)}>
                        {evt.nomSeverite}
                      </span>
                    </td>
                    <td>{localisationLisible(evt)}</td>
                    <td>{evt.valeurEchelle}</td>
                    <td>
                      {evt.nbVehiculesNecessaire ?? '—'} véhicule(s)
                    </td>
                    <td>
                      <span className={`badge ${classStatut(evt.nomStatut)}`}>
                        {evt.nomStatut}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedId(evt.id)
                        }}
                      >
                        Voir
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          ouvrirEdition(evt)
                        }}
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="event-detail-card">
          <div className="detail-header">
            <div>
              <p className="muted small">Fiche événement</p>
              <h3>{selection ? `#${selection.id}` : 'Aucune sélection'}</h3>
            </div>
            {selection && (
              <span className={classSeverite(selection.nomSeverite)}>
                {selection.nomSeverite}
              </span>
            )}
          </div>

          {!selection && (
            <p className="muted">Cliquez sur une ligne pour afficher les détails.</p>
          )}

          {selection && (
            <div className="detail-body">
              <p className="detail-title">{selection.nomTypeEvenement}</p>
              <p className="muted">{selection.description}</p>

              <div className="detail-grid">
                <div>
                  <p className="muted small">Statut</p>
                  <span className={`badge ${classStatut(selection.nomStatut)}`}>
                    {selection.nomStatut}
                  </span>
                </div>
                <div>
                  <p className="muted small">Ressources requises</p>
                  <p className="detail-strong">
                    {selection.nbVehiculesNecessaire ?? '—'} véhicule(s)
                  </p>
                </div>
                <div>
                  <p className="muted small">Échelle</p>
                  <p className="detail-strong">{selection.valeurEchelle}</p>
                </div>
                <div>
                  <p className="muted small">Localisation</p>
                  <p className="detail-strong">
                    {localisationLisible(selection)}
                  </p>
                </div>
              </div>

              <div className="detail-note">
                Intervenant en charge : information non fournie par l’API pour
                l’instant. Relier aux interventions dès que disponible.
              </div>

              <div className="detail-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => selection && ouvrirEdition(selection)}
                >
                  Modifier localement
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={ouvrirCreation}
                >
                  Nouvel événement
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {formMode && formState && (
        <Modal
          titre={
            formMode === 'creation'
              ? 'Créer un événement (POST /api/evenements)'
              : 'Modifier un événement (local)'
          }
          onClose={remettreAZeroForm}
        >
          <form
            className="incident-form"
            onSubmit={(e) => {
              e.preventDefault()
              void soumettreFormulaire()
            }}
          >
            <label>
              Description
              <textarea
                value={formState.description}
                onChange={(e) => mettreAJourForm('description', e.target.value)}
                rows={3}
                required
                placeholder="Ex : Incendie d'appartement"
              />
            </label>
            <div className="form-grid">
              <label>
                Type d'événement
                <select
                  value={formState.idTypeEvenement}
                onChange={(e) =>
                  mettreAJourForm('idTypeEvenement', e.target.value)
                }
                required
              >
                  {types.length === 0 && (
                    <option value="" disabled>
                      Référence type indisponible
                    </option>
                  )}
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.nomTypeEvenement}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gravité
                <select
                  value={formState.idSeverite}
                onChange={(e) => mettreAJourForm('idSeverite', e.target.value)}
                required
              >
                  {severites.length === 0 && (
                    <option value="" disabled>
                      Référentiel gravité manquant
                    </option>
                  )}
                  {severites.map((sev) => (
                    <option key={sev.id} value={sev.id}>
                      {sev.nomSeverite} ({sev.valeurEchelle})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Statut (réutilise ceux présents en base)
                <select
                  value={formState.idStatut}
                onChange={(e) => mettreAJourForm('idStatut', e.target.value)}
                required
              >
                  {statutsDisponibles.length === 0 && (
                    <option value="" disabled>
                      Aucun statut disponible pour le moment
                    </option>
                  )}
                  {statutsDisponibles.map((statut) => (
                    <option key={statut.id} value={statut.id}>
                      {statut.nom}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Latitude
                <input
                  type="number"
                  step="0.0001"
                  value={formState.latitude}
                  onChange={(e) => mettreAJourForm('latitude', e.target.value)}
                  required
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.0001"
                  value={formState.longitude}
                  onChange={(e) => mettreAJourForm('longitude', e.target.value)}
                  required
                />
              </label>
            </div>

            {formError && <p className="erreur">{formError}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={remettreAZeroForm}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="primary"
                disabled={formLoading}
              >
                {formMode === 'creation' ? 'Envoyer vers API' : 'Enregistrer'}
              </button>
            </div>
            {formMode === 'edition' && (
              <p className="muted small">
                En attendant un endpoint PUT côté API, la modification reste
                locale.
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}

export default EvenementsPage
