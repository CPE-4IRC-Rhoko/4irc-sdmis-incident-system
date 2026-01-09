import { useEffect, useMemo, useRef, useState } from 'react'
import MapView, { type VueCarte } from '../components/MapView'
import Modal from '../components/Modal'
import {
  LIBELLES_GRAVITE_INCIDENT,
} from '../models/incident'
import type { GraviteIncident, Incident, StatutIncident } from '../models/incident'
import type {
  CategorieRessource,
  Ressource,
} from '../models/resource'
import type { EvenementApi, SeveriteReference, TypeEvenementReference } from '../models/evenement'
import {
  createEvenement,
  getEvenementsSnapshots,
  getSeverites,
  getTypesEvenement,
} from '../services/evenements'
import { getInterventionsSnapshots } from '../services/interventions'
import { getVehiculesSnapshots } from '../services/vehicules'
import {
  subscribeSdmisSse,
  type EvenementSnapshot,
  type InterventionSnapshot,
  type VehiculeSnapshot,
} from '../services/sse'
import EvenementsPage from './EvenementsPage'
import RessourcesPage from './RessourcesPage'
import AffectationsPage from './AffectationsPage'
import './QGPage.css'
import '../components/IncidentForm.css'

type SuggestionAdresse = {
  id: string
  label: string
  latitude: number
  longitude: number
}

type FormulaireCarte = {
  description: string
  latitude: number
  longitude: number
  nomTypeEvenement: string
  nomSeverite: string
  idTypeEvenement?: string
  idSeverite?: string
}

const vueInitiale: VueCarte = {
  latitude: 45.7578,
  longitude: 4.8351,
  zoom: 12.4,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
}

const normaliserStatutIncident = (statutTexte: string): StatutIncident => {
  const texte = (statutTexte ?? '').toLowerCase()
  if (
    texte.includes('résol') ||
    texte.includes('resol') ||
    texte.includes('clos') ||
    texte.includes('clôt') ||
    texte.includes('annul')
  ) {
    return 'CLOTURE'
  }
  if (texte.includes('cours') || texte.includes('intervention')) {
    return 'EN_COURS'
  }
  return 'NOUVEAU'
}

const estStatutCloture = (statutTexte: string) => {
  const texte = (statutTexte ?? '').toLowerCase()
  return (
    texte.includes('résol') ||
    texte.includes('resol') ||
    texte.includes('clos') ||
    texte.includes('clôt') ||
    texte.includes('annul')
  )
}

const normaliserGravite = (
  valeurEchelle: string | null | undefined,
  nomSeverite: string | null | undefined,
): GraviteIncident => {
  const valeur = Number.parseInt(valeurEchelle ?? '', 10)
  if (!Number.isNaN(valeur)) {
    if (valeur >= 4) return 'CRITIQUE'
    if (valeur >= 2) return 'MOYENNE'
  }
  const texte = (nomSeverite ?? '').toLowerCase()
  if (texte.includes('grave') || texte.includes('crit')) return 'CRITIQUE'
  if (texte.includes('mod') || texte.includes('moy')) return 'MOYENNE'
  return 'FAIBLE'
}

const incidentDepuisApi = (evt: EvenementApi): Incident => ({
  id: evt.id,
  titre:
    (evt.nomTypeEvenement && evt.nomTypeEvenement.trim().length > 0
      ? evt.nomTypeEvenement
      : evt.description) ?? 'Événement',
  description: evt.description,
  statut: normaliserStatutIncident(evt.nomStatut),
  gravite: normaliserGravite(evt.valeurEchelle, evt.nomSeverite),
  latitude: evt.latitude,
  longitude: evt.longitude,
  derniereMiseAJour: new Date().toISOString(),
  statutLabel: evt.nomStatut,
})

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

const disponibiliteDepuisStatutVehicule = (
  statut: string,
): Ressource['disponibilite'] => {
  const texte = (statut ?? '').toLowerCase()
  if (
    texte.includes('intervention') ||
    texte.includes('cours') ||
    texte.includes('route') ||
    texte.includes('occup')
  ) {
    return 'OCCUPE'
  }
  if (texte.includes('dispon')) return 'DISPONIBLE'
  return 'HORS_LIGNE'
}

const interventionEstActive = (intervention: InterventionSnapshot) => {
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

const ressourcesDepuisEtat = (
  vehicules: VehiculeSnapshot[],
  interventions: InterventionSnapshot[],
  evenements: EvenementApi[],
): Ressource[] => {
  const mapEvenements = new Map(evenements.map((evt) => [evt.id, evt]))
  const interventionsActives = interventions.filter(interventionEstActive)
  const vehiculesEngages = new Set(
    interventionsActives.map((intervention) => intervention.idVehicule),
  )

  const disponibles: Ressource[] = vehicules
    .filter((vehicule) => !vehiculesEngages.has(vehicule.id))
    .map((vehicule) => ({
      id: vehicule.id,
      nom: vehicule.caserne
        ? `Véhicule ${vehicule.caserne}`
        : `Véhicule ${vehicule.id.slice(0, 8)}`,
      type: 'Véhicule',
      categorie: 'POMPIERS',
      disponibilite: disponibiliteDepuisStatutVehicule(vehicule.statut),
      latitude: vehicule.latitude,
      longitude: vehicule.longitude,
      statutBrut: vehicule.statut,
      equipements:
        vehicule.equipements?.map((eq) => ({
          nom: eq.nomEquipement,
          contenance: eq.contenanceCourante,
        })) ?? [],
      plaque: vehicule.plaqueImmat,
    }))

  const engages: Ressource[] = interventionsActives
    .map((intervention) => {
      const evt = mapEvenements.get(intervention.idEvenement)
      if (!evt) return null
      const vehicule = vehicules.find(
        (veh) => veh.id === intervention.idVehicule,
      )
      return {
        id: intervention.idVehicule,
        nom: `Véhicule engagé • ${intervention.statusIntervention}`,
        type: 'Affecté',
        categorie: 'POMPIERS',
        disponibilite: 'OCCUPE',
        latitude: evt.latitude,
        longitude: evt.longitude,
        equipements:
          vehicule?.equipements?.map((eq) => ({
            nom: eq.nomEquipement,
            contenance: eq.contenanceCourante,
          })) ?? [],
        statutBrut: vehicule?.statut,
        plaque: intervention.plaqueImmat ?? vehicule?.plaqueImmat,
      } as Ressource
    })
    .filter(Boolean) as Ressource[]

  return [...disponibles, ...engages]
}

const libelleCategorie = (categorie: CategorieRessource | string) => {
  switch (categorie) {
    case 'POMPIERS':
      return 'Véhicules'
    default:
      return 'Ressources'
  }
}

function QGPage() {
  const [evenements, setEvenements] = useState<Incident[]>([])
  const [evenementsApi, setEvenementsApi] = useState<EvenementApi[]>([])
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [evenementSelectionneId, setEvenementSelectionneId] = useState<
    string | undefined
  >(undefined)
  const [vueCarte, setVueCarte] = useState<VueCarte>(vueInitiale)
  const [sectionQG, setSectionQG] = useState<'TABLEAU' | 'EVENEMENTS' | 'RESSOURCES' | 'AFFECTATIONS'>(
    'TABLEAU',
  )
  const [etatChargement, setEtatChargement] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [rechercheTexte, setRechercheTexte] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestionAdresse[]>([])
  const [rechercheEnCours, setRechercheEnCours] = useState(false)
  const [pointRecherche, setPointRecherche] = useState<SuggestionAdresse | null>(
    null,
  )
  const [formCarte, setFormCarte] = useState<FormulaireCarte | null>(null)
  const [formErreur, setFormErreur] = useState<string | null>(null)
  const [formChargement, setFormChargement] = useState(false)
  const [types, setTypes] = useState<TypeEvenementReference[]>([])
  const [severites, setSeverites] = useState<SeveriteReference[]>([])
  const [, setInterventionsData] = useState<InterventionSnapshot[]>([])
  const [, setVehiculesData] = useState<VehiculeSnapshot[]>([])
  const [popupEvenementId, setPopupEvenementId] = useState<string | null>(null)
  const [popupRessourceId, setPopupRessourceId] = useState<string | null>(null)
  const [statutEvenementParId, setStatutEvenementParId] = useState<
    Record<string, string>
  >({})
  const evenementsRef = useRef<EvenementApi[]>([])
  const interventionsRef = useRef<InterventionSnapshot[]>([])
  const vehiculesRef = useRef<VehiculeSnapshot[]>([])
  const vehiculesSseOkRef = useRef(false)

  const handleSelectEvenement = (id: string) => {
    setEvenementSelectionneId(id)
    setPopupEvenementId(id)
    setPopupRessourceId(null)
  }

  const handleSelectRessource = (id: string) => {
    setPopupRessourceId(id)
    setPopupEvenementId(null)
  }

  const fermerPopups = () => {
    setPopupEvenementId(null)
    setPopupRessourceId(null)
  }

  const chargerVehiculesFallback = async () => {
    try {
      const vehiculesApi = await getVehiculesSnapshots()
      const vehiculesMaj = vehiculesApi.map((vehicule) => ({
        id: vehicule.id,
        latitude: vehicule.latitude,
        longitude: vehicule.longitude,
        statut: vehicule.statut,
        caserne: vehicule.caserne,
        equipements: vehicule.equipements,
        plaqueImmat: undefined,
      }))
      vehiculesRef.current = vehiculesMaj
      setVehiculesData(vehiculesMaj)
      setRessources(
        ressourcesDepuisEtat(
          vehiculesMaj,
          interventionsRef.current,
          evenementsRef.current,
        ),
      )
      setEtatChargement((prev) => (prev === 'ready' ? prev : 'ready'))
    } catch (error) {
      console.error('Fallback véhicules échoué', error)
    }
  }

  const mettreAJourEvenementsSnapshots = (snapshots: EvenementSnapshot[]) => {
    if (snapshots.length === 0) return
    setEvenementsApi((prev) => {
      const map = new Map(prev.map((evt) => [evt.id, evt]))
      snapshots.forEach((snapshot) => {
        const courant = map.get(snapshot.idEvenement)
        map.set(snapshot.idEvenement, {
          ...courant,
          id: snapshot.idEvenement,
          description: snapshot.description,
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          nomStatut: snapshot.statutEvenement,
          nomTypeEvenement: snapshot.typeEvenement,
          nomSeverite: snapshot.severite,
          valeurEchelle: snapshot.echelleSeverite,
          nbVehiculesNecessaire:
            snapshot.nbVehiculesNecessaire ??
            courant?.nbVehiculesNecessaire ??
            null,
          idTypeEvenement: courant?.idTypeEvenement ?? '',
          idStatut: courant?.idStatut ?? '',
          idSeverite: courant?.idSeverite ?? '',
        })
      })
      const next = Array.from(map.values())
      evenementsRef.current = next
      const mapStatut: Record<string, string> = {}
      next.forEach((evt) => {
        mapStatut[evt.id] = evt.nomStatut
      })
      setStatutEvenementParId(mapStatut)
      setEvenements(next.map(incidentDepuisApi))
      setEvenementSelectionneId((prev) =>
        prev && next.some((evt) => evt.id === prev) ? prev : next[0]?.id,
      )
      setRessources(
        ressourcesDepuisEtat(
          vehiculesRef.current,
          interventionsRef.current,
          next,
        ),
      )
      return next
    })
  }

  const mettreAJourInterventionsSnapshots = (
    snapshots: InterventionSnapshot[],
  ) => {
    if (snapshots.length === 0) return
    setInterventionsData((prev) => {
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
      const next = Array.from(map.values())
      interventionsRef.current = next
      setRessources(
        ressourcesDepuisEtat(
          vehiculesRef.current,
          next,
          evenementsRef.current,
        ),
      )
      return next
    })
  }

  const mettreAJourVehiculesSnapshots = (snapshots: VehiculeSnapshot[]) => {
    if (snapshots.length === 0) return
    setVehiculesData((prev) => {
      const map = new Map(prev.map((veh) => [veh.id, veh]))
      snapshots.forEach((vehicule) => {
        const courant = map.get(vehicule.id)
        map.set(vehicule.id, {
          ...courant,
          ...vehicule,
          equipements: vehicule.equipements ?? courant?.equipements ?? [],
          plaqueImmat: vehicule.plaqueImmat ?? courant?.plaqueImmat,
        })
      })
      const next = Array.from(map.values())
      vehiculesRef.current = next
      setRessources(
        ressourcesDepuisEtat(
          next,
          interventionsRef.current,
          evenementsRef.current,
        ),
      )
      return next
    })
    vehiculesSseOkRef.current = true
    setEtatChargement((prev) => (prev === 'ready' ? prev : 'ready'))
  }

  const choisirSuggestion = (suggestion: SuggestionAdresse) => {
    setPointRecherche(suggestion)
    setSuggestions([])
    setVueCarte((prev) => ({
      ...prev,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      zoom: Math.max(prev.zoom, 14),
      transitionDuration: 600,
    }))
    setRechercheTexte(suggestion.label)
  }

  const ouvrirCreationDepuisCarte = () => {
    if (!pointRecherche) return
    const typeRef = types[0]
    const severiteRef = severites[0]
    setFormErreur(null)
    setFormChargement(false)
    setFormCarte({
      description: '',
      latitude: pointRecherche.latitude,
      longitude: pointRecherche.longitude,
      nomTypeEvenement: typeRef?.nom ?? '',
      nomSeverite: severiteRef?.nomSeverite ?? '',
      idTypeEvenement: typeRef?.id,
      idSeverite: severiteRef?.id,
    })
  }

  const mettreAJourFormCarte = (
    champ: keyof FormulaireCarte,
    valeur: string | number,
  ) => {
    setFormCarte((prev) =>
      prev
        ? {
            ...prev,
            [champ]: valeur,
          }
        : prev,
    )
  }

  const soumettreCreationDepuisCarte = async () => {
    if (!formCarte) return
    setFormErreur(null)
    if (
      !formCarte.nomTypeEvenement ||
      !formCarte.nomSeverite
    ) {
      setFormErreur(
        'Sélectionnez un type et une gravité pour créer un événement.',
      )
      return
    }
    try {
      setFormChargement(true)
      const payload = {
        description: formCarte.description,
        latitude: Number(formCarte.latitude),
        longitude: Number(formCarte.longitude),
        nomTypeEvenement: formCarte.nomTypeEvenement,
        nomSeverite: formCarte.nomSeverite,
        nomStatut: 'Déclaré',
      }
      const created = await createEvenement(payload)
      const incident = incidentDepuisApi(created)
      setEvenements((prev) => [incident, ...prev])
      setEvenementSelectionneId(created.id)
      setFormCarte(null)
      setPointRecherche(null)
    } catch (error) {
      setFormErreur(
        error instanceof Error
          ? error.message
          : 'Échec de la création côté API.',
      )
    } finally {
      setFormChargement(false)
    }
  }

  useEffect(() => {
    if (rechercheTexte.trim().length < 3) {
      setSuggestions([])
      setRechercheEnCours(false)
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setRechercheEnCours(true)
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(
          rechercheTexte,
        )}`
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'fr',
          },
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Recherche d’adresse indisponible pour le moment.')
        }
        const data: Array<{ lat: string; lon: string; display_name: string; place_id?: number }> =
          await response.json()
        setSuggestions(
          data.map((item, index) => ({
            id: String(item.place_id ?? index),
            label: item.display_name,
            latitude: Number.parseFloat(item.lat),
            longitude: Number.parseFloat(item.lon),
          })),
        )
      } catch (error) {
        if (controller.signal.aborted) return
        console.error(error)
      } finally {
        setRechercheEnCours(false)
      }
    }, 320)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [rechercheTexte])

  useEffect(() => {
    const controller = new AbortController()
    const charger = async () => {
      setEtatChargement('loading')
      setErreurChargement(null)
      try {
        const [
          evtSnapshots,
          vehiculesSnapshots,
          interventionsSnapshots,
          severitesApi,
          typesApi,
        ] = await Promise.all([
          getEvenementsSnapshots(controller.signal),
          getVehiculesSnapshots(controller.signal),
          getInterventionsSnapshots(controller.signal),
          getSeverites(controller.signal),
          getTypesEvenement(controller.signal),
        ])

        const evtApi = evtSnapshots.map(evenementDepuisSnapshot)
        const vehiculesInitial = vehiculesSnapshots.map((vehicule) => ({
          id: vehicule.id,
          latitude: vehicule.latitude,
          longitude: vehicule.longitude,
          statut: vehicule.statut,
          caserne: vehicule.caserne,
          equipements: vehicule.equipements,
          plaqueImmat: undefined,
        }))
        const interventionsInitial: InterventionSnapshot[] =
          interventionsSnapshots.map((intervention) => ({
            idEvenement: intervention.idEvenement,
            idVehicule: intervention.idVehicule,
            statusIntervention: intervention.statusIntervention,
            dateDebutIntervention: intervention.dateDebutIntervention,
            dateFinIntervention: intervention.dateFinIntervention,
            plaqueImmat: intervention.plaqueImmat,
          }))
        const incidents = evtApi.map(incidentDepuisApi)
        setEvenements(incidents)
        setEvenementsApi(evtApi)
        setVehiculesData(vehiculesInitial)
        setInterventionsData(interventionsInitial)
        evenementsRef.current = evtApi
        vehiculesRef.current = vehiculesInitial
        interventionsRef.current = interventionsInitial
        setRessources(
          ressourcesDepuisEtat(vehiculesInitial, interventionsInitial, evtApi),
        )
        const severitesTriees = [...severitesApi].sort(
          (a, b) =>
            Number.parseInt(a.valeurEchelle, 10) -
            Number.parseInt(b.valeurEchelle, 10),
        )
        setSeverites(severitesTriees)
        setTypes(typesApi)
        const mapStatut: Record<string, string> = {}
        evtApi.forEach((evt) => {
          mapStatut[evt.id] = evt.nomStatut
        })
        setStatutEvenementParId(mapStatut)
        setEvenementSelectionneId((prev) =>
          prev && incidents.some((evt) => evt.id === prev)
            ? prev
            : incidents[0]?.id,
        )
        setEtatChargement('ready')
      } catch (error) {
        if (controller.signal.aborted) return
        setErreurChargement(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les données carte',
        )
        setEtatChargement('error')
      }
    }

    void charger()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const es = subscribeSdmisSse({
      onVehicules: mettreAJourVehiculesSnapshots,
      onInterventions: mettreAJourInterventionsSnapshots,
      onEvenements: mettreAJourEvenementsSnapshots,
      onError: (err) => {
        console.error('SSE temps réel', err)
        if (!vehiculesSseOkRef.current) {
          void chargerVehiculesFallback()
        }
      },
    })
    return () => {
      es.close()
    }
  }, [])

  const derniereMiseAJour = useMemo(
    () =>
      new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [evenements, ressources],
  )

  const evenementsCarte = useMemo(
    () => evenements.filter((evt) => evt.statut !== 'CLOTURE'),
    [evenements],
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

  const evenementsPrioritaires = useMemo(() => {
    const actifs = evenementsApi.filter((evt) => !estStatutCloture(evt.nomStatut))
    const ordonner = [...actifs].sort((a, b) => {
      const gravA = Number.parseInt(a.valeurEchelle ?? '0', 10)
      const gravB = Number.parseInt(b.valeurEchelle ?? '0', 10)
      return gravB - gravA
    })
    return ordonner.slice(0, 3)
  }, [evenementsApi])

  const ressourcesParCategorie = useMemo(() => {
    const aggregates = new Map<
      CategorieRessource | 'AUTRE',
      { total: number; dispo: number; occupe: number; horsLigne: number }
    >()
    ressources.forEach((res) => {
      const cle = res.categorie ?? 'AUTRE'
      const groupe =
        aggregates.get(cle) ??
        { total: 0, dispo: 0, occupe: 0, horsLigne: 0 }
      groupe.total += 1
      if (res.disponibilite === 'DISPONIBLE') groupe.dispo += 1
      if (res.disponibilite === 'OCCUPE') groupe.occupe += 1
      if (res.disponibilite === 'HORS_LIGNE') groupe.horsLigne += 1
      aggregates.set(cle, groupe)
    })
    return aggregates
  }, [ressources])

  return (
    <div className="qg-dashboard">
      <nav className="nav-vertical">
        <p className="nav-label">Navigation</p>
        <button
          className={`nav-item ${
            sectionQG === 'TABLEAU' ? 'nav-active' : ''
          }`}
          type="button"
          onClick={() => setSectionQG('TABLEAU')}
        >
          Tableau de bord
        </button>
        <button
          className={`nav-item ${
            sectionQG === 'EVENEMENTS' ? 'nav-active' : ''
          }`}
          type="button"
          onClick={() => setSectionQG('EVENEMENTS')}
        >
          Événements
        </button>
        <button
          className={`nav-item ${
            sectionQG === 'RESSOURCES' ? 'nav-active' : ''
          }`}
          type="button"
          onClick={() => setSectionQG('RESSOURCES')}
        >
          Ressources
        </button>
        <button
          className={`nav-item ${
            sectionQG === 'AFFECTATIONS' ? 'nav-active' : ''
          }`}
          type="button"
          onClick={() => setSectionQG('AFFECTATIONS')}
        >
          Affectations
        </button>
        <button className="nav-item" type="button">
          Historique
        </button>
        <div className="nav-separator" />
        <button className="nav-item" type="button">
          Paramètres
        </button>
      </nav>

      {sectionQG === 'EVENEMENTS' ? (
        <div className="evenements-wrapper">
          <EvenementsPage />
        </div>
      ) : sectionQG === 'RESSOURCES' ? (
        <div className="evenements-wrapper">
          <RessourcesPage />
        </div>
      ) : sectionQG === 'AFFECTATIONS' ? (
        <div className="evenements-wrapper">
          <AffectationsPage />
        </div>
      ) : (
        <>
          <section className="map-zone">
            <div className="map-search">
              <div className="search-input">
                <input
                  type="text"
                  placeholder="Localiser une adresse ou des coordonnées GPS..."
                  value={rechercheTexte}
                  onChange={(e) => setRechercheTexte(e.target.value)}
                />
                <button
                  type="button"
                  title="Rechercher"
                  disabled={rechercheEnCours}
                >
                  {rechercheEnCours ? '…' : '🔍'}
                </button>
              </div>
              {suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => choisirSuggestion(suggestion)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
              {etatChargement === 'loading' && (
                <p className="muted small map-status">
                  Chargement des données API...
                </p>
              )}
              {etatChargement === 'error' && (
                <p className="map-status erreur">{erreurChargement}</p>
              )}
              {pointRecherche && (
                <div className="search-selected">
                  <p className="muted small">Adresse sélectionnée</p>
                  <p className="search-selected-title">{pointRecherche.label}</p>
                  <p className="muted small">
                    {pointRecherche.latitude.toFixed(5)},{' '}
                    {pointRecherche.longitude.toFixed(5)}
                  </p>
                  <div className="search-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={ouvrirCreationDepuisCarte}
                      disabled={formChargement}
                    >
                      Créer un événement ici
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setPointRecherche(null)
                        setSuggestions([])
                      }}
                    >
                      Effacer
                    </button>
                  </div>
                </div>
              )}
            </div>
            <MapView
              evenements={evenementsCarte}
              ressources={ressources}
              pointInteret={
                pointRecherche
                  ? {
                      latitude: pointRecherche.latitude,
                      longitude: pointRecherche.longitude,
                      label: pointRecherche.label,
                    }
                  : undefined
              }
              evenementSelectionneId={evenementSelectionneId}
              popupEvenementId={popupEvenementId}
            popupRessourceId={popupRessourceId}
            statutEvenementParId={statutEvenementParId}
            onSelectEvenement={handleSelectEvenement}
            onSelectRessource={handleSelectRessource}
            onClosePopups={fermerPopups}
            onClickPointInteret={
              pointRecherche ? ouvrirCreationDepuisCarte : undefined
              }
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
                <span className="legend-vehicle engage"></span> Ressource affectée
              </div>
              <div className="legend-row">
                <span className="legend-vehicle dispo"></span> Ressource disponible
              </div>
              <div className="legend-row">
                <span className="legend-pin" /> Point recherché
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
                <p className="small accent">Suivi en temps réel</p>
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
                <button
                  className="link"
                  type="button"
                  onClick={() => setSectionQG('EVENEMENTS')}
                >
                  Tout voir
                </button>
              </div>
              <div className="priority-list">
                {evenementsPrioritaires.map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    className={`priority-item ${
                      evenementSelectionneId === evt.id ? 'priority-active' : ''
                    }`}
                    onClick={() => {
                      setEvenementSelectionneId(evt.id)
                      const incidentCible = evenements.find(
                        (inc) => inc.id === evt.id,
                      )
                      if (incidentCible) {
                        setVueCarte((prev) => ({
                          ...prev,
                          latitude: incidentCible.latitude,
                          longitude: incidentCible.longitude,
                          zoom: Math.max(prev.zoom, 14),
                          transitionDuration: 800,
                        }))
                        setPopupEvenementId(incidentCible.id)
                        setPopupRessourceId(null)
                      }
                    }}
                  >
                    <div className="priority-top">
                      <span
                        className={`pill gravite-${normaliserGravite(evt.valeurEchelle, evt.nomSeverite).toLowerCase()}`}
                      >
                        {LIBELLES_GRAVITE_INCIDENT[
                          normaliserGravite(evt.valeurEchelle, evt.nomSeverite)
                        ]}
                      </span>
                      <span className="muted small">
                        {evt.nbVehiculesNecessaire ?? '—'} véhicule(s)
                      </span>
                    </div>
                    <p className="item-title">{evt.nomTypeEvenement}</p>
                    <p className="muted small">
                      {evt.description ?? 'Information en cours'}
                    </p>
                    <span className="badge badge-statut">{evt.nomStatut}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card-block">
              <div className="card-header">
                <h4>État des ressources</h4>
                <button
                  className="link"
                  type="button"
                  onClick={() => setSectionQG('RESSOURCES')}
                >
                  Tout voir
                </button>
              </div>
              <div className="resource-bars">
                {Array.from(ressourcesParCategorie.entries()).map(
                  ([key, stats]) => (
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
                  ),
                )}
              </div>
            </section>
          </aside>
        </>
      )}

      {formCarte && (
        <Modal
          titre="Créer un événement"
          onClose={() => setFormCarte(null)}
        >
          <form
            className="incident-form"
            onSubmit={(e) => {
              e.preventDefault()
              void soumettreCreationDepuisCarte()
            }}
          >
            <label>
              Description
              <textarea
                value={formCarte.description}
                onChange={(e) =>
                  mettreAJourFormCarte('description', e.target.value)
                }
                rows={3}
                required
                placeholder="Ex : Incendie d'appartement"
              />
            </label>
            <div className="form-grid">
              <label>
                Type d'événement
                <select
                  value={formCarte.idTypeEvenement ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    const ref = types.find((type) => type.id === value)
                    setFormCarte((prev) =>
                      prev
                        ? {
                            ...prev,
                            idTypeEvenement: value,
                            nomTypeEvenement:
                              ref?.nom ?? prev.nomTypeEvenement,
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
                  value={formCarte.idSeverite ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    const ref = severites.find((sev) => sev.id === value)
                    setFormCarte((prev) =>
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
                  {severites.map((sev) => (
                    <option key={sev.id} value={sev.id}>
                      {sev.nomSeverite} ({sev.valeurEchelle})
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
                  value={formCarte.latitude}
                  onChange={(e) =>
                    mettreAJourFormCarte('latitude', e.target.value)
                  }
                  required
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="0.0001"
                  value={formCarte.longitude}
                  onChange={(e) =>
                    mettreAJourFormCarte('longitude', e.target.value)
                  }
                  required
                />
              </label>
            </div>

            {formErreur && <p className="erreur">{formErreur}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setFormCarte(null)}
              >
                Annuler
              </button>
              <button type="submit" className="primary" disabled={formChargement}>
                Créer un événement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default QGPage
