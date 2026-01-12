import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import './RessourcesPage.css'
import '../components/IncidentForm.css'
import {
  getVehiculesIdentifiants,
  getVehiculesSnapshots,
  registerVehicule,
} from '../services/vehicules'
import { getInterventionsSnapshots } from '../services/interventions'
import { getEvenementsSnapshots } from '../services/evenements'
import { getCasernes } from '../services/casernes'
import { getEquipements } from '../services/equipements'
import Modal from '../components/Modal'
import {
  subscribeSdmisSse,
  type InterventionSnapshot,
  type VehiculeSnapshot,
} from '../services/sse'
import { getStoredRoles } from '../services/auth'
import type { CaserneReference } from '../models/caserne'
import type { EquipementReference } from '../models/equipement'

type StatutVehicule = 'DISPONIBLE' | 'INTERVENTION' | 'MAINTENANCE'

type VehiculeView = {
  position: string
  statut: StatutVehicule
  incidentId?: string | null
  incidentNom?: string | null
  equipements?: Array<{ nomEquipement: string; contenanceCourante: number }>
  plaque?: string
  id: string
}

const statutVehiculeDepuisTexte = (statut: string): StatutVehicule => {
  const texte = (statut ?? '').toLowerCase()
  if (texte.includes('intervention') || texte.includes('route')) {
    return 'INTERVENTION'
  }
  if (texte.includes('dispon')) return 'DISPONIBLE'
  return 'MAINTENANCE'
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

const poidsStatut = (statut: StatutVehicule) => {
  if (statut === 'DISPONIBLE') return 0
  if (statut === 'INTERVENTION') return 1
  return 2
}

const interventionsActivesMap = (
  interventions: InterventionSnapshot[],
) => {
  const engagements = new Map<string, InterventionSnapshot>()
  interventions.filter(interventionActive).forEach((intervention) => {
    engagements.set(intervention.idVehicule, intervention)
  })
  return engagements
}

const vehiculesDepuisSnapshots = (
  vehiculesApi: VehiculeSnapshot[],
  interventions: InterventionSnapshot[],
  evenements: Record<string, string>,
): VehiculeView[] => {
  const engagements = interventionsActivesMap(interventions)
  return vehiculesApi.map((vehicule) => {
    const intervention = engagements.get(vehicule.id)
    const statut = intervention
      ? 'INTERVENTION'
      : statutVehiculeDepuisTexte(vehicule.statut)
    return {
      id: vehicule.id,
      position: `${vehicule.latitude.toFixed(4)}, ${vehicule.longitude.toFixed(4)}`,
      statut,
      incidentId: intervention?.idEvenement,
      incidentNom: intervention ? evenements[intervention.idEvenement] ?? null : null,
      equipements:
        vehicule.equipements?.map((eq) => ({
          nomEquipement: eq.nomEquipement,
          contenanceCourante: eq.contenanceCourante,
        })) ?? [],
      plaque: vehicule.plaqueImmat,
    }
  })
}

function RessourcesPage() {
  const [isAdmin, setIsAdmin] = useState(
    getStoredRoles().includes('ROLE_FRONT_Admin'),
  )
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
  const [formVehicule, setFormVehicule] = useState<{
    plaqueImmat: string
    cleIdent: string
    idCaserne: string
    equipements: string[]
  }>({
    plaqueImmat: '',
    cleIdent: '',
    idCaserne: '',
    equipements: [],
  })
  const [casernes, setCasernes] = useState<CaserneReference[]>([])
  const [equipementsRef, setEquipementsRef] = useState<EquipementReference[]>([])
  const [clesIdentifiants, setClesIdentifiants] = useState<string[]>([])
  const [plaquesExistantes, setPlaquesExistantes] = useState<string[]>([])
  const [creationErreur, setCreationErreur] = useState<string | null>(null)
  const [creationSucces, setCreationSucces] = useState<string | null>(null)
  const [creationChargement, setCreationChargement] = useState(false)
  const [chargementReferences, setChargementReferences] = useState(false)
  const [, setInterventions] = useState<InterventionSnapshot[]>([])
  const interventionsRef = useRef<InterventionSnapshot[]>([])
  const evenementsMapRef = useRef<Record<string, string>>({})
  const equipementsSelectionnes = formVehicule.equipements.length

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setEtat('loading')
      setErreur(null)
      try {
        const [vehiculesApi, interventionsApi, evenementsApi] = await Promise.all([
          getVehiculesSnapshots(controller.signal),
          getInterventionsSnapshots(controller.signal),
          getEvenementsSnapshots(controller.signal),
        ])
        const mapEvenements = evenementsApi.reduce<Record<string, string>>(
          (acc, evt) => {
            acc[evt.idEvenement] = evt.typeEvenement ?? 'Événement'
            return acc
          },
          {},
        )
        evenementsMapRef.current = mapEvenements
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
        setVehicules(
          vehiculesDepuisSnapshots(
            vehiculesApi,
            interventionsInitial,
            evenementsMapRef.current,
          ),
        )
        setInterventions(interventionsInitial)
        interventionsRef.current = interventionsInitial
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
    const handleStorage = () => {
      setIsAdmin(getStoredRoles().includes('ROLE_FRONT_Admin'))
    }
    handleStorage()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!modalInfo || !isAdmin) return
    const controller = new AbortController()
    const chargerReferences = async () => {
      setCreationErreur(null)
      setCreationSucces(null)
      setChargementReferences(true)
      try {
        const [cles, casernesApi, equipementsApi, vehiculesApi] = await Promise.all([
          getVehiculesIdentifiants(controller.signal),
          getCasernes(controller.signal),
          getEquipements(controller.signal),
          getVehiculesSnapshots(controller.signal),
        ])
        setClesIdentifiants(
          cles
            .map((ident) => ident.cleIdent)
            .filter((cle) => !!cle),
        )
        setCasernes(casernesApi)
        setEquipementsRef(equipementsApi)
        setPlaquesExistantes(
          vehiculesApi
            .map((vehicule) => vehicule.plaqueImmat?.trim())
            .filter((plaque): plaque is string => !!plaque && plaque.length > 0),
        )
        setFormVehicule((prev) => ({
          ...prev,
          idCaserne: prev.idCaserne || casernesApi[0]?.id || '',
        }))
      } catch (error) {
        if (controller.signal.aborted) return
        setCreationErreur(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les références véhicule.',
        )
      } finally {
        setChargementReferences(false)
      }
    }
    void chargerReferences()
    return () => controller.abort()
  }, [modalInfo, isAdmin])

  useEffect(() => {
    if (!isAdmin && modalInfo) {
      setModalInfo(false)
    }
  }, [isAdmin, modalInfo])

  const normalizePlaque = useCallback(
    (value: string) => value.trim().replace(/\s+/g, '').toLowerCase(),
    [],
  )
  const plaqueSaisie = formVehicule.plaqueImmat.trim().toUpperCase()
  const plaqueInvalide =
    plaqueSaisie.length > 0 && (!/^[A-Z0-9]{7}$/.test(plaqueSaisie) || plaqueSaisie.length !== 7)
  const cleIdentSaisie = formVehicule.cleIdent.trim()
  const cleIdentExisteDeja = useMemo(
    () =>
      cleIdentSaisie.length === 16 &&
      clesIdentifiants.some(
        (cle) => (cle ?? '').trim().toLowerCase() === cleIdentSaisie.toLowerCase(),
      ),
    [cleIdentSaisie, clesIdentifiants],
  )
  const plaqueExisteDeja = useMemo(() => {
    const current = normalizePlaque(formVehicule.plaqueImmat)
    if (!current) return false
    return plaquesExistantes.some((plaque) => normalizePlaque(plaque) === current)
  }, [formVehicule.plaqueImmat, normalizePlaque, plaquesExistantes])

  useEffect(() => {
    const es = subscribeSdmisSse({
      onVehicules: (data: VehiculeSnapshot[]) => {
        setVehicules((prev) => {
          const engagements = new Map<string, string>()
          interventionsRef.current
            .filter(interventionActive)
            .forEach((intervention) => {
              engagements.set(
                intervention.idVehicule,
                intervention.idEvenement,
              )
            })
          const map = new Map(prev.map((v) => [v.id, v]))
          data.forEach((veh) => {
            map.set(veh.id, {
              id: veh.id,
              position: `${veh.latitude.toFixed(4)}, ${veh.longitude.toFixed(4)}`,
              statut: engagements.has(veh.id)
                ? 'INTERVENTION'
                : statutVehiculeDepuisTexte(veh.statut),
              incidentId: engagements.get(veh.id) ?? null,
              incidentNom: engagements.get(veh.id)
                ? evenementsMapRef.current[engagements.get(veh.id) ?? ''] ?? null
                : null,
              equipements:
                veh.equipements?.map((eq) => ({
                  nomEquipement: eq.nomEquipement,
                  contenanceCourante: eq.contenanceCourante,
                })) ?? map.get(veh.id)?.equipements,
              plaque: veh.plaqueImmat ?? map.get(veh.id)?.plaque,
            })
          })
          return Array.from(map.values())
        })
        setEtat((prev) => (prev === 'ready' ? prev : 'ready'))
      },
      onInterventions: (data: InterventionSnapshot[]) => {
        if (data.length === 0) return
        setInterventions((prev) => {
          const map = new Map(
            prev.map((intervention) => [
              `${intervention.idEvenement}-${intervention.idVehicule}`,
              intervention,
            ]),
          )
          data.forEach((intervention) => {
            map.set(
              `${intervention.idEvenement}-${intervention.idVehicule}`,
              intervention,
            )
          })
          const next = Array.from(map.values())
          interventionsRef.current = next
          const engagements = new Map<string, string>()
          next.filter(interventionActive).forEach((intervention) => {
            engagements.set(intervention.idVehicule, intervention.idEvenement)
          })
          setVehicules((prevVehicules) =>
            prevVehicules.map((vehicule) => ({
              ...vehicule,
              statut: engagements.has(vehicule.id)
                ? 'INTERVENTION'
                : vehicule.statut === 'MAINTENANCE'
                  ? 'MAINTENANCE'
                  : 'DISPONIBLE',
              incidentId: engagements.get(vehicule.id) ?? null,
              incidentNom: engagements.get(vehicule.id)
                ? evenementsMapRef.current[engagements.get(vehicule.id) ?? ''] ?? null
                : null,
            })),
          )
          return next
        })
      },
      onEvenements: (data) => {
        if (!data || data.length === 0) return
        const next = { ...evenementsMapRef.current }
        data.forEach((evt) => {
          next[evt.idEvenement] = evt.typeEvenement ?? 'Événement'
        })
        evenementsMapRef.current = next
        setVehicules((prev) =>
          prev.map((vehicule) => ({
            ...vehicule,
            incidentNom: vehicule.incidentId
              ? evenementsMapRef.current[vehicule.incidentId] ?? vehicule.incidentNom ?? null
              : null,
          })),
        )
      },
      onError: (err) => {
        console.error('SSE ressources erreur', err)
      },
    })
    return () => es.close()
  }, [])

  const resetFormCreation = useCallback(() => {
    setFormVehicule({
      plaqueImmat: '',
      cleIdent: '',
      idCaserne: casernes[0]?.id ?? '',
      equipements: [],
    })
    setCreationErreur(null)
  }, [casernes])

  const toggleEquipement = useCallback((equipementId: string) => {
    setFormVehicule((prev) => {
      const present = prev.equipements.includes(equipementId)
      return {
        ...prev,
        equipements: present
          ? prev.equipements.filter((eq) => eq !== equipementId)
          : [...prev.equipements, equipementId],
      }
    })
  }, [])

  const soumettreCreationVehicule = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!isAdmin) {
        setCreationErreur('Seul un administrateur peut créer un véhicule.')
        return
      }
      setCreationErreur(null)
      setCreationSucces(null)
      const plaque = formVehicule.plaqueImmat.trim()
      const cle = cleIdentSaisie
      const caserneId = formVehicule.idCaserne.trim()
      if (!plaque || !cle || !caserneId) {
        setCreationErreur(
          'Renseignez l’immatriculation, la clé et l’identifiant caserne.',
        )
        return
      }
      if (plaqueInvalide) {
        setCreationErreur(
          'L’immatriculation doit contenir exactement 7 caractères alphanumériques.',
        )
        return
      }
      if (plaqueExisteDeja) {
        setCreationErreur('Cette immatriculation existe déjà en base, choisissez-en une autre.')
        return
      }
      if (cle.length !== 16) {
        setCreationErreur('La clé d’identification doit contenir exactement 16 caractères.')
        return
      }
      setCreationChargement(true)
      try {
        const identifiants = await getVehiculesIdentifiants()
        setClesIdentifiants(
          identifiants
            .map((ident) => ident.cleIdent)
            .filter((cleIdent) => !!cleIdent),
        )
        const cleExistante = identifiants.some(
          (ident) => (ident.cleIdent ?? '').trim().toLowerCase() === cle.toLowerCase(),
        )
        if (cleExistante) {
          setCreationErreur('Cette clé existe déjà en base, choisissez-en une autre.')
          return
        }
        const equipements = formVehicule.equipements
          .map((eq) => eq.trim())
          .filter((eq) => eq.length > 0)
        await registerVehicule({
          plaqueImmat: plaque,
          cleIdent: cle,
          idCaserne: caserneId,
          equipements,
        })
        setClesIdentifiants((prev) => [...prev, cle])
        setCreationSucces('Véhicule créé avec succès.')
        const vehiculesApi = await getVehiculesSnapshots()
        setVehicules(
          vehiculesDepuisSnapshots(
            vehiculesApi,
            interventionsRef.current,
            evenementsMapRef.current,
          ),
        )
        setEtat('ready')
        setPage(1)
        resetFormCreation()
      } catch (error) {
        setCreationErreur(
          error instanceof Error
            ? error.message
            : 'Création impossible pour le moment.',
        )
      } finally {
        setCreationChargement(false)
      }
    },
    [
      cleIdentSaisie,
      plaqueExisteDeja,
      formVehicule.idCaserne,
      formVehicule.plaqueImmat,
      formVehicule.equipements,
      isAdmin,
      resetFormCreation,
    ],
  )

  const fermerModalCreation = useCallback(() => {
    resetFormCreation()
    setCreationSucces(null)
    setChargementReferences(false)
    setModalInfo(false)
  }, [resetFormCreation])

  const vehiculesFiltres = useMemo(() => {
    const texte = filtreTexte.trim().toLowerCase()
    const filtres = vehicules.filter((v) => {
      const okTexte =
        texte.length === 0 ||
        v.id.toLowerCase().includes(texte) ||
        (v.plaque ?? '').toLowerCase().includes(texte) ||
        v.statut.toLowerCase().includes(texte) ||
        texte.includes(v.statut.toLowerCase()) ||
        (v.incidentNom ?? '').toLowerCase().includes(texte) ||
        (v.equipements ?? []).some((eq) =>
          `${eq.nomEquipement ?? ''}`.toLowerCase().includes(texte),
        )
      const okStatut = filtreStatut === 'TOUS' || v.statut === filtreStatut
      return okTexte && okStatut
    })
    return [...filtres].sort((a, b) => {
      const diff = poidsStatut(a.statut) - poidsStatut(b.statut)
      if (diff !== 0) return diff
      return (a.plaque ?? a.id).localeCompare(b.plaque ?? b.id)
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
        {isAdmin && (
          <button
            className="primary"
            type="button"
            onClick={() => setModalInfo(true)}
          >
            Ajouter un véhicule
          </button>
        )}
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
            placeholder="Rechercher par ID, plaque ou disponibilité..."
            value={filtreTexte}
            onChange={(e) => {
              setFiltreTexte(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="toolbar-filters">
          <label>
            État
            <select
              value={filtreStatut}
              onChange={(e) => {
                setFiltreStatut(e.target.value as StatutVehicule | 'TOUS')
                setPage(1)
              }}
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
                <th>Plaque</th>
                <th>Position actuelle</th>
                <th>Disponibilité</th>
                <th>Événement assigné</th>
                <th>Équipements</th>
              </tr>
            </thead>
            <tbody>
              {vehiculesPage.map((v) => (
                <tr key={v.id}>
                  <td>{v.plaque ?? '—'}</td>
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
                <td>{v.incidentNom ?? '—'}</td>
                <td>
                  {v.equipements && v.equipements.length > 0
                    ? v.equipements
                          .map(
                            (eq) =>
                              `${eq.nomEquipement ?? 'Ressource'} (${
                                eq.contenanceCourante ?? 0
                              })`,
                          )
                          .join(', ')
                      : '—'}
                  </td>
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

      {modalInfo && isAdmin && (
        <Modal titre="Ajouter un véhicule" onClose={fermerModalCreation}>
          <form
            className="incident-form"
            onSubmit={(event) => {
              void soumettreCreationVehicule(event)
            }}
          >
            <div className="form-grid">
              <label>
                Immatriculation
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={formVehicule.plaqueImmat}
                  onChange={(e) =>
                    setFormVehicule((prev) => ({
                      ...prev,
                      plaqueImmat: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="AA123AA"
                  disabled={creationChargement || chargementReferences}
                />
                <p
                  className={`form-helper small ${plaqueInvalide ? 'error' : 'muted'}`}
                >
                  {plaqueSaisie.length}/7 caractères.
                </p>
                {plaqueExisteDeja && (
                  <div className="creation-alert">
                    Cette immatriculation existe déjà en base, veuillez en saisir une autre.
                  </div>
                )}
              </label>
              <label>
                Clé d’identification
                <input
                  type="text"
                  required
                  minLength={16}
                  maxLength={16}
                  value={formVehicule.cleIdent}
                  onChange={(e) =>
                    setFormVehicule((prev) => ({
                      ...prev,
                      cleIdent: e.target.value.slice(0, 16),
                    }))
                  }
                  placeholder="Clé d'identification unique"
                  disabled={creationChargement || chargementReferences}
                />
                <p className="form-helper muted small">
                  {cleIdentSaisie.length}/16 caractères.
                </p>
                {cleIdentExisteDeja && (
                  <div className="creation-alert">
                    Cette clé existe déjà en base, veuillez en saisir une autre.
                  </div>
                )}
              </label>
            </div>

            <label>
              Caserne rattachée
              <select
                value={formVehicule.idCaserne}
                onChange={(e) =>
                  setFormVehicule((prev) => ({
                    ...prev,
                    idCaserne: e.target.value,
                  }))
                }
                required
                disabled={creationChargement || casernes.length === 0}
              >
                {casernes.length === 0 && (
                  <option value="" disabled>
                    Aucune caserne chargée
                  </option>
                )}
                {casernes.map((caserne) => (
                  <option key={caserne.id} value={caserne.id}>
                    {caserne.nom}
                  </option>
                ))}
              </select>
            </label>

            <div className="equipements-section">
              <div className="multibox-header">
                <div>
                  <p className="label">Équipements à embarquer</p>
                  <p className="muted small">
                    Sélection multiple — {equipementsSelectionnes} sélectionné
                    {equipementsSelectionnes > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="selected-counter">
                  {equipementsSelectionnes}
                </div>
              </div>
              <div className="equipements-multibox">
                {equipementsRef.length === 0 && (
                  <p className="muted small">Aucun équipement chargé.</p>
                )}
                {equipementsRef.map((eq) => (
                  <label key={eq.id} className="multibox-item">
                    <input
                      type="checkbox"
                      checked={formVehicule.equipements.includes(eq.id)}
                      onChange={() => toggleEquipement(eq.id)}
                      disabled={creationChargement}
                    />
                    <span>{eq.nom}</span>
                  </label>
                ))}
              </div>
            </div>

            {chargementReferences && (
              <p className="muted small">Chargement des clés existantes...</p>
            )}
            {creationErreur && (
              <div className="creation-alert">{creationErreur}</div>
            )}
            {creationSucces && (
              <div className="creation-feedback success">
                {creationSucces}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={fermerModalCreation}
                disabled={creationChargement}
              >
                Annuler
              </button>
              <button
                className="primary"
                type="submit"
                disabled={
                  creationChargement ||
                  chargementReferences ||
                  cleIdentExisteDeja ||
                  plaqueInvalide ||
                  plaqueExisteDeja ||
                  formVehicule.cleIdent.trim().length !== 16 ||
                  formVehicule.plaqueImmat.trim().length !== 7 ||
                  !formVehicule.idCaserne
                }
              >
                {creationChargement ? 'Création...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default RessourcesPage
