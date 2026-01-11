import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal'
import './EvenementsPage.css'
import '../components/IncidentForm.css'
import {
  createEvenement,
  getEvenementsSnapshots,
  getSeverites,
  getTypesEvenement,
  updateEvenement,
} from '../services/evenements'
import {
  subscribeSdmisSse,
  type EvenementSnapshot,
  type InterventionSnapshot,
} from '../services/sse'
import { getInterventionsSnapshots } from '../services/interventions'
import type {
  EvenementApi,
  EvenementCreatePayload,
  SeveriteReference,
  TypeEvenementReference,
} from '../models/evenement'

type FormMode = 'creation' | 'edition'

interface FormState extends EvenementCreatePayload {
  id?: string
  idTypeEvenement?: string
  idSeverite?: string
  idStatut?: string
}

const niveauSeverite = (
  libelle: string | null | undefined,
): 'critique' | 'moyenne' | 'faible' => {
  const texte = (libelle ?? '').toLowerCase()
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

const poidsSeverite = (libelle: string | null | undefined) => {
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
    texte.includes('clôt') ||
    texte.includes('annul')
  ) {
    return 'statut-resolu'
  }
  return 'statut-neutre'
}

const estCloture = (statut: string) => {
  const texte = (statut ?? '').toLowerCase()
  return (
    texte.includes('résol') ||
    texte.includes('resol') ||
    texte.includes('clos') ||
    texte.includes('clôt') ||
    texte.includes('annul')
  )
}

const estActif = (statut: string) => !estCloture(statut)

const formatCoord = (value: number) => value.toFixed(4)

const localisationLisible = (evt: EvenementApi) =>
  `${formatCoord(evt.latitude)}, ${formatCoord(evt.longitude)}`

const STATUT_CREATION_FIXE = 'Déclaré'

const enrichirEvenementAvecRefs = (
  evt: EvenementApi,
  types: TypeEvenementReference[],
  severites: SeveriteReference[],
): EvenementApi => {
  const typeRef =
    types.find((type) => type.id === evt.idTypeEvenement) ??
    types.find(
      (type) =>
        type.nom.toLowerCase() === evt.nomTypeEvenement.toLowerCase(),
    )
  const severiteRef =
    severites.find((sev) => sev.id === evt.idSeverite) ??
    severites.find(
      (sev) =>
        sev.nomSeverite.toLowerCase() === evt.nomSeverite.toLowerCase(),
    )
  return {
    ...evt,
    idTypeEvenement: evt.idTypeEvenement || typeRef?.id || '',
    idSeverite: evt.idSeverite || severiteRef?.id || '',
    nomStatut: evt.nomStatut || STATUT_CREATION_FIXE,
  }
}

const evenementDepuisSnapshot = (
  snapshot: EvenementSnapshot,
): EvenementApi => ({
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
})

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
  const [page, setPage] = useState(1)
  const pageSize = 5

  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [interventions, setInterventions] = useState<InterventionSnapshot[]>([])

  const finParEvenement = useMemo(() => {
    const map = new Map<string, number>()
    interventions.forEach((intervention) => {
      if (!intervention.dateFinIntervention) return
      const fin = new Date(intervention.dateFinIntervention).getTime()
      const current = map.get(intervention.idEvenement)
      if (!current || fin > current) {
        map.set(intervention.idEvenement, fin)
      }
    })
    return map
  }, [interventions])

  const statutsDisponibles = useMemo(() => {
    const map = new Map<string, string>()
    evenements.forEach((evt) => {
      const key = evt.idStatut || evt.nomStatut
      map.set(key, evt.nomStatut)
    })
    if (map.size === 0) {
      map.set('default', 'Déclaré')
    }
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }))
  }, [evenements])

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setEtat('loading')
      setErreur(null)
      try {
        const [evtSnapshots, interventionsApi, severitesApi, typesApi] = await Promise.all([
          getEvenementsSnapshots(controller.signal),
          getInterventionsSnapshots(controller.signal),
          getSeverites(controller.signal),
          getTypesEvenement(controller.signal),
        ])
        const evtApi = evtSnapshots
          .map(evenementDepuisSnapshot)
          .map((evt) => enrichirEvenementAvecRefs(evt, typesApi, severitesApi))
        setEvenements(evtApi)
        setInterventions(
          interventionsApi.map((intervention) => ({
            idEvenement: intervention.idEvenement,
            idVehicule: intervention.idVehicule,
            statusIntervention: intervention.statusIntervention,
            dateDebutIntervention: intervention.dateDebutIntervention,
            dateFinIntervention: intervention.dateFinIntervention,
            plaqueImmat: intervention.plaqueImmat,
          })),
        )
        const severitesTriees = [...severitesApi].sort(
          (a, b) =>
            Number.parseInt(a.valeurEchelle, 10) -
            Number.parseInt(b.valeurEchelle, 10),
        )
        setSeverites(severitesTriees)
        setTypes(typesApi)
        setEtat('ready')
        setPage(1)
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

const appliquerSnapshotsEvenements = useCallback(
  (snapshots: EvenementSnapshot[]) => {
    if (snapshots.length === 0) return
    setEvenements((prev) => {
      const map = new Map(prev.map((evt) => [evt.id, evt]))
      snapshots.forEach((snapshot) => {
        const courant = map.get(snapshot.idEvenement)
        const enrichi = enrichirEvenementAvecRefs(
          {
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
          },
          types,
          severites,
        )
        map.set(snapshot.idEvenement, {
          ...courant,
          ...enrichi,
        })
      })
      const next = Array.from(map.values())
      setSelectedId((prev) =>
        prev && next.some((evt) => evt.id === prev) ? prev : next[0]?.id ?? null,
      )
      return next
    })
  },
  [types, severites],
)

  const appliquerSnapshotsInterventions = useCallback(
    (snapshots: InterventionSnapshot[]) => {
      if (snapshots.length === 0) return
      setInterventions((prev) => {
        const map = new Map(
          prev.map((intervention) => [
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
        return Array.from(map.values())
      })
    },
    [],
  )

  useEffect(() => {
    const es = subscribeSdmisSse({
      onEvenements: appliquerSnapshotsEvenements,
      onInterventions: appliquerSnapshotsInterventions,
      onError: (err) => console.error('SSE événements (onglet)', err),
    })
    return () => es.close()
  }, [appliquerSnapshotsEvenements, appliquerSnapshotsInterventions])

  const evenementsRecents = useMemo(() => {
    const limite = Date.now() - 24 * 60 * 60 * 1000
    return evenements.filter((evt) => {
      if (!estCloture(evt.nomStatut)) return true
      const fin = finParEvenement.get(evt.id)
      if (fin && fin < limite) {
        return false
      }
      return true
    })
  }, [evenements, finParEvenement])

  const evenementsFiltres = useMemo(() => {
    const recherche = filtreTexte.trim().toLowerCase()
    return [...evenementsRecents]
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
          filtreStatut === 'tous' ||
          evt.idStatut === filtreStatut ||
          evt.nomStatut === filtreStatut
        return correspondTexte && correspondSeverite && correspondStatut
      })
      .sort(
        (a, b) => poidsSeverite(b.nomSeverite) - poidsSeverite(a.nomSeverite),
      )
  }, [evenementsRecents, filtreTexte, filtreSeverite, filtreStatut])

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

  useEffect(() => {
    setPage(1)
  }, [filtreTexte, filtreSeverite, filtreStatut])

  const totalPages = Math.max(1, Math.ceil(evenementsFiltres.length / pageSize))
  const evenementsPage = useMemo(() => {
    const start = (page - 1) * pageSize
    return evenementsFiltres.slice(start, start + pageSize)
  }, [evenementsFiltres, page])

  const metriques = useMemo(() => {
    const severiteCritique = evenementsRecents.filter(
      (evt) => niveauSeverite(evt.nomSeverite) === 'critique',
    ).length
    const besoinsRessources = evenementsRecents.filter(
      (evt) => (evt.nbVehiculesNecessaire ?? 0) > 0,
    ).length
    const limite = Date.now() - 24 * 60 * 60 * 1000
    const clotures = evenementsRecents.filter((evt) => {
      if (!estCloture(evt.nomStatut)) return false
      const fin = finParEvenement.get(evt.id)
      return !fin || fin >= limite
    }).length
    const actifs = evenementsRecents.filter((evt) => estActif(evt.nomStatut)).length
    const geres24h = new Set<string>()
    interventions.forEach((intervention) => {
      const debut = intervention.dateDebutIntervention
        ? new Date(intervention.dateDebutIntervention).getTime()
        : null
      const fin = intervention.dateFinIntervention
        ? new Date(intervention.dateFinIntervention).getTime()
        : null
      if (
        (debut && debut >= limite) ||
        (fin && fin >= limite)
      ) {
        geres24h.add(intervention.idEvenement)
      }
    })
    return {
      actifs,
      critiques: severiteCritique,
      besoinsRessources,
      clotures,
    }
  }, [evenementsRecents, interventions])

  const remettreAZeroForm = () => {
    setFormMode(null)
    setFormState(null)
    setFormError(null)
    setFormLoading(false)
  }

  const ouvrirCreation = () => {
    setFormMode('creation')
    setFormError(null)
    const typeRef = types[0]
    const severiteRef = severites[0]
    setFormState({
      description: '',
      latitude: evenements[0]?.latitude ?? 45.7578,
      longitude: evenements[0]?.longitude ?? 4.8351,
      nomTypeEvenement: typeRef?.nom ?? '',
      nomSeverite: severiteRef?.nomSeverite ?? '',
      nomStatut: STATUT_CREATION_FIXE,
      idTypeEvenement: typeRef?.id,
      idSeverite: severiteRef?.id,
      idStatut: undefined,
    })
  }

const ouvrirEdition = (evt: EvenementApi) => {
  setFormMode('edition')
  setFormError(null)
  const typeRef =
      types.find((type) => type.id === evt.idTypeEvenement) ??
      types.find(
        (type) =>
          type.nom.toLowerCase() === evt.nomTypeEvenement.toLowerCase(),
      )
    const severiteRef =
      severites.find((sev) => sev.id === evt.idSeverite) ??
      severites.find(
        (sev) => sev.nomSeverite.toLowerCase() === evt.nomSeverite.toLowerCase(),
      )
    const statutRef =
      statutsDisponibles.find((statut) => statut.id === evt.idStatut) ??
      statutsDisponibles.find(
        (statut) => statut.nom.toLowerCase() === evt.nomStatut.toLowerCase(),
      )
    setFormState({
      id: evt.id,
      description: evt.description,
      latitude: evt.latitude,
      longitude: evt.longitude,
      nomTypeEvenement: typeRef?.nom ?? evt.nomTypeEvenement,
      nomSeverite: severiteRef?.nomSeverite ?? evt.nomSeverite,
      nomStatut: statutRef?.nom ?? evt.nomStatut,
      idTypeEvenement: typeRef?.id ?? evt.idTypeEvenement ?? evt.nomTypeEvenement,
      idSeverite: severiteRef?.id ?? evt.idSeverite ?? evt.nomSeverite,
      idStatut: statutRef?.id ?? evt.idStatut ?? evt.nomStatut,
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

    if (formMode === 'edition') {
      if (!formState.id) {
        setFormError('Impossible de modifier : identifiant manquant.')
        return
      }
      const severiteRef = severites.find(
        (sev) => sev.id === formState.idSeverite,
      )
      const typeRef = types.find((type) => type.id === formState.idTypeEvenement)

      if (!typeRef || !severiteRef) {
        setFormError('Type ou gravité manquant pour la mise à jour.')
        return
      }

      try {
        setFormLoading(true)
        const updated = await updateEvenement(formState.id, {
          description: formState.description,
          latitude: Number(formState.latitude),
          longitude: Number(formState.longitude),
          nomTypeEvenement: typeRef.nom,
          nomSeverite: severiteRef.nomSeverite,
        })
        setEvenements((prev) =>
          prev.map((evt) =>
            evt.id === updated.id
              ? {
                  ...evt,
                  description: updated.description,
                  latitude: updated.latitude,
                  longitude: updated.longitude,
                  idTypeEvenement: updated.idTypeEvenement,
                  idSeverite: updated.idSeverite,
                  nomTypeEvenement: updated.nomTypeEvenement,
                  nomSeverite: updated.nomSeverite,
                  nomStatut: updated.nomStatut,
                  nbVehiculesNecessaire: updated.nbVehiculesNecessaire,
                  valeurEchelle: updated.valeurEchelle,
                }
              : evt,
          ),
        )
        remettreAZeroForm()
        return
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : 'Échec de la mise à jour de l’événement.',
        )
      } finally {
        setFormLoading(false)
      }
      return
    }

    try {
      setFormLoading(true)
      const typeRef = types.find((type) => type.id === formState.idTypeEvenement)
      const severiteRef = severites.find(
        (sev) => sev.id === formState.idSeverite,
      )
      const statutNom = formMode === 'creation' ? STATUT_CREATION_FIXE : formState.nomStatut ?? undefined

      if (!typeRef || !severiteRef || !statutNom) {
        setFormError(
          "Références manquantes pour l'envoi (type, gravité ou statut).",
        )
        setFormLoading(false)
        return
      }

      const payload: EvenementCreatePayload = {
        description: formState.description,
        latitude: Number(formState.latitude),
        longitude: Number(formState.longitude),
        nomTypeEvenement: typeRef.nom,
        nomSeverite: severiteRef.nomSeverite,
        nomStatut: statutNom,
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
        </div>
        <div className="events-actions">
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
          <h3>{metriques.actifs}</h3>
        </div>
        <div className="metric-card severe">
          <p className="muted small">Gravité critique</p>
          <h3>{metriques.critiques}</h3>
        </div>
        <div className="metric-card success">
          <p className="muted small">Événements clôturés (24h)</p>
          <h3>{metriques.clotures}</h3>
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
            <div />
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
                  <th>Type</th>
                  <th>Gravité</th>
                  <th>Localisation</th>
                  <th>Échelle</th>
                  <th>Ressources recommandées</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {evenementsPage.map((evt) => (
                  <tr
                    key={evt.id}
                    className={selectedId === evt.id ? 'row-active' : ''}
                    onClick={() => {
                      setSelectedId(evt.id)
                      ouvrirEdition(evt)
                    }}
                  >
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {etat === 'ready' && evenementsFiltres.length > 0 && (
            <div className="pagination">
              <div className="muted small">
                Affichage de {(page - 1) * pageSize + 1} à{' '}
                {Math.min(page * pageSize, evenementsFiltres.length)} sur{' '}
                {evenementsFiltres.length} résultats
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
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {formMode && formState && (
        <Modal
          titre={
            formMode === 'creation'
              ? 'Créer un événement'
              : 'Consulter / modifier un événement'
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
                  value={formState.idTypeEvenement ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  const ref = types.find((type) => type.id === value)
                  setFormState((prev) =>
                    prev
                      ? {
                          ...prev,
                          idTypeEvenement: value,
                          nomTypeEvenement: ref?.nom ?? prev.nomTypeEvenement,
                        }
                      : prev,
                  )
                }}
                required
              >
                  {types.length === 0 && (
                    <option value="" disabled>
                      Référence type indisponible
                    </option>
                  )}
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gravité
                <select
                  value={formState.idSeverite ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  const ref = severites.find((sev) => sev.id === value)
                  setFormState((prev) =>
                    prev
                      ? {
                          ...prev,
                          idSeverite: value,
                          nomSeverite: ref?.nomSeverite ?? prev.nomSeverite,
                        }
                      : prev,
                  )
                }}
                required
              >
                  {severites.length === 0 && (
                    <option value="" disabled>
                      Référentiel gravité manquant
                    </option>
                  )}
                  {severites.map((sev, index) => (
                    <option key={sev.id ?? `${sev.nomSeverite}-${index}`} value={sev.id}>
                      {sev.nomSeverite} ({sev.valeurEchelle})
                    </option>
                  ))}
                </select>
              </label>
            {formMode === 'edition' && (
              <label>
                Statut
                <input type="text" value={formState.nomStatut ?? ''} disabled />
              </label>
            )}
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
                {formMode === 'creation' ? 'Créer un événement' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default EvenementsPage
