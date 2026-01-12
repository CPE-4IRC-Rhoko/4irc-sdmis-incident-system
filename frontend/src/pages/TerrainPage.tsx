import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView, { type RouteTrace, type VueCarte } from '../components/MapView'
import type { GraviteIncident, Incident, StatutIncident } from '../models/incident'
import type { EvenementApi } from '../models/evenement'
import type { Ressource } from '../models/resource'
import {
  subscribeSdmisSse,
  type EvenementSnapshot,
  type InterventionSnapshot,
  type VehiculeSnapshot,
} from '../services/sse'
import { getEvenementsSnapshots } from '../services/evenements'
import {
  getInterventionsSnapshots,
  postClotureIntervention,
  type ClotureInterventionPayload,
} from '../services/interventions'
import { getVehiculesSnapshots } from '../services/vehicules'
import { fetchOsrmRoute } from '../services/osrm'
import { getStoredRoles } from '../services/auth'
import './TerrainPage.css'

type TrajetAssocie = RouteTrace & {
  idVehicule: string
  idEvenement: string
  distance: number
  duration: number
  start: { latitude: number; longitude: number }
  end: { latitude: number; longitude: number }
  source?: 'osrm' | 'fallback'
}

const vueTerrain: VueCarte = {
  latitude: 45.7578,
  longitude: 4.8351,
  zoom: 11.2,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
}

const isValidCoord = (lat?: number, lon?: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  (lat as number) >= -90 &&
  (lat as number) <= 90 &&
  (lon as number) >= -180 &&
  (lon as number) <= 180

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

const evenementDepuisSnapshot = (snapshot: EvenementSnapshot): EvenementApi => ({
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

const interventionEstActive = (intervention: InterventionSnapshot) => {
  const statut = (intervention.statusIntervention ?? '').toLowerCase()
  if (
    statut.includes('annul') ||
    statut.includes('term') ||
    statut.includes('clos') ||
    statut.includes('attent') ||
    intervention.dateFinIntervention
  ) {
    return false
  }
  // Statuts à considérer comme engagés, même en cours de traitement.
  if (statut.includes('trait')) return true
  return true
}

const distanceMetres = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
) => {
  const R = 6371000
  const dLat = ((end.latitude - start.latitude) * Math.PI) / 180
  const dLon = ((end.longitude - start.longitude) * Math.PI) / 180
  const lat1 = (start.latitude * Math.PI) / 180
  const lat2 = (end.latitude * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const couleursRoutes = ['#2563eb', '#d97706', '#16a34a', '#ec4899', '#0ea5e9', '#a855f7']
const colorFromId = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return couleursRoutes[hash % couleursRoutes.length]
}

const formatDistance = (meters?: number) => {
  if (!meters || meters <= 0) return 'Distance inconnue'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

const formatDuree = (seconds?: number) => {
  if (!seconds || seconds <= 0) return 'Durée inconnue'
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return '<1 min'
  if (minutes >= 120) return `${Math.round(minutes / 60)} h`
  return `${minutes} min`
}

function TerrainPage() {
  const [vue, setVue] = useState<VueCarte>(vueTerrain)
  const [roles] = useState<string[]>(getStoredRoles())
  const [evenements, setEvenements] = useState<Incident[]>([])
  const [evenementsApi, setEvenementsApi] = useState<EvenementApi[]>([])
  const [vehicules, setVehicules] = useState<VehiculeSnapshot[]>([])
  const [interventions, setInterventions] = useState<InterventionSnapshot[]>([])
  const [statutEvenementParId, setStatutEvenementParId] = useState<
    Record<string, string>
  >({})
  const [routes, setRoutes] = useState<TrajetAssocie[]>([])
  const [popupEvenementId, setPopupEvenementId] = useState<string | null>(null)
  const [popupVehiculeId, setPopupVehiculeId] = useState<string | null>(null)
  const [missionSelectionneeId, setMissionSelectionneeId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionErreur, setActionErreur] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [etatChargement, setEtatChargement] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [vehiculeSuiviId, setVehiculeSuiviId] = useState<string | null>(null)

  const isAdmin = roles.includes('ROLE_FRONT_Admin')
  const isTerrain = roles.includes('ROLE_FRONT_Terrain')

  const evenementsRef = useRef<EvenementApi[]>([])
  const vehiculesRef = useRef<VehiculeSnapshot[]>([])
  const interventionsRef = useRef<InterventionSnapshot[]>([])
  const routesRef = useRef<Record<string, TrajetAssocie>>({})
  const pendingRoutesRef = useRef<Set<string>>(new Set())

  const setRoutesFromRef = useCallback(() => {
    setRoutes(Object.values(routesRef.current))
  }, [])

const synchroniserRoutes = useCallback(() => {
    const evenementsMap = new Map(evenementsRef.current.map((evt) => [evt.id, evt]))
    const vehiculesMap = new Map(vehiculesRef.current.map((veh) => [veh.id, veh]))
    const actifs = interventionsRef.current.filter(interventionEstActive)
    const actifsValides = actifs
      .map((intervention) => {
        const vehicule = vehiculesMap.get(intervention.idVehicule)
        const evenement = evenementsMap.get(intervention.idEvenement)
        if (!vehicule || !evenement) return null
        if (
          !isValidCoord(vehicule.latitude, vehicule.longitude) ||
          !isValidCoord(evenement.latitude, evenement.longitude)
        ) {
          return null
        }
        return { intervention, vehicule, evenement }
      })
      .filter(Boolean) as Array<{
      intervention: InterventionSnapshot
      vehicule: VehiculeSnapshot
      evenement: EvenementApi
    }>

    const actifsKeys = new Set(
      actifsValides.map(
        ({ intervention }) => `${intervention.idVehicule}-${intervention.idEvenement}`,
      ),
    )

    Object.keys(routesRef.current).forEach((key) => {
      if (!actifsKeys.has(key)) delete routesRef.current[key]
    })
    setRoutesFromRef()

    actifsValides.forEach(({ intervention, vehicule, evenement }) => {
      const key = `${intervention.idVehicule}-${intervention.idEvenement}`
      if (pendingRoutesRef.current.has(key)) return

      const start = { latitude: vehicule.latitude, longitude: vehicule.longitude }
      const end = { latitude: evenement.latitude, longitude: evenement.longitude }
      const existing = routesRef.current[key]

      if (
        existing &&
        existing.source === 'osrm' &&
        distanceMetres(existing.start, start) < 30 &&
        distanceMetres(existing.end, end) < 10
      ) {
        return
      }

      pendingRoutesRef.current.add(key)
      void fetchOsrmRoute(start, end)
        .then((route) => {
          routesRef.current[key] = {
            id: key,
            idVehicule: intervention.idVehicule,
            idEvenement: intervention.idEvenement,
            coordinates: route.coordinates,
            color: colorFromId(intervention.idVehicule),
            distance: route.distance,
            duration: route.duration,
            start,
            end,
            source: 'osrm',
          }
          setRoutesFromRef()
        })
        .catch((error) => {
          console.error('Calcul itinéraire OSRM', error)
          // Fallback minimal pour afficher quelque chose et éviter les distances inconnues
          const dist = distanceMetres(start, end)
          const estimatedDuration = dist / 15 // ~54 km/h
          routesRef.current[key] = {
            id: key,
            idVehicule: intervention.idVehicule,
            idEvenement: intervention.idEvenement,
            coordinates: [
              [start.longitude, start.latitude],
              [end.longitude, end.latitude],
            ],
            color: colorFromId(intervention.idVehicule),
            distance: dist,
            duration: estimatedDuration,
            start,
            end,
            source: 'fallback',
          }
          setRoutesFromRef()
        })
        .finally(() => {
          pendingRoutesRef.current.delete(key)
        })
    })
  }, [setRoutesFromRef])

  const mettreAJourEvenementsSnapshots = useCallback(
    (snapshots: EvenementSnapshot[]) => {
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
        setEvenements(next.map(incidentDepuisApi))
        const mapStatut: Record<string, string> = {}
        next.forEach((evt) => {
          mapStatut[evt.id] = evt.nomStatut
        })
        setStatutEvenementParId(mapStatut)
        synchroniserRoutes()
        return next
      })
    },
    [synchroniserRoutes],
  )

  const mettreAJourInterventionsSnapshots = useCallback(
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
        const next = Array.from(map.values())
        interventionsRef.current = next
        synchroniserRoutes()
        return next
      })
    },
    [synchroniserRoutes],
  )

  const mettreAJourVehiculesSnapshots = useCallback(
    (snapshots: VehiculeSnapshot[]) => {
      if (snapshots.length === 0) return
      setVehicules((prev) => {
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
        synchroniserRoutes()
        return next
      })
    },
    [synchroniserRoutes],
  )

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
        ] = await Promise.all([
          getEvenementsSnapshots(controller.signal),
          getVehiculesSnapshots(controller.signal),
          getInterventionsSnapshots(controller.signal),
        ])

        const evtApi = evtSnapshots.map(evenementDepuisSnapshot)
        const vehiculesInitial = vehiculesSnapshots.map((vehicule) => ({
          id: vehicule.id,
          latitude: vehicule.latitude,
          longitude: vehicule.longitude,
          statut: vehicule.statut,
          caserne: vehicule.caserne,
          equipements: vehicule.equipements,
          plaqueImmat: vehicule.plaqueImmat,
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

        evenementsRef.current = evtApi
        vehiculesRef.current = vehiculesInitial
        interventionsRef.current = interventionsInitial

        setEvenementsApi(evtApi)
        setEvenements(evtApi.map(incidentDepuisApi))
        setVehicules(vehiculesInitial)
        setInterventions(interventionsInitial)

        const mapStatut: Record<string, string> = {}
        evtApi.forEach((evt) => {
          mapStatut[evt.id] = evt.nomStatut
        })
        setStatutEvenementParId(mapStatut)

        setEtatChargement('ready')
        synchroniserRoutes()
      } catch (error) {
        if (controller.signal.aborted) return
        setErreurChargement(
          error instanceof Error
            ? error.message
            : 'Impossible de charger la carte terrain',
        )
        setEtatChargement('error')
      }
    }

    void charger()
    return () => controller.abort()
  }, [synchroniserRoutes])

  useEffect(() => {
    const es = subscribeSdmisSse({
      onVehicules: mettreAJourVehiculesSnapshots,
      onInterventions: mettreAJourInterventionsSnapshots,
      onEvenements: mettreAJourEvenementsSnapshots,
      onError: (err) => {
        console.error('SSE terrain', err)
      },
    })
    return () => {
      es.close()
    }
  }, [
    mettreAJourEvenementsSnapshots,
    mettreAJourInterventionsSnapshots,
    mettreAJourVehiculesSnapshots,
  ])

  useEffect(() => {
    if (isAdmin) return
    if (vehiculeSuiviId) return
    const premier = vehicules[0]?.id
    if (premier) {
      setVehiculeSuiviId(premier)
    }
  }, [isAdmin, vehiculeSuiviId, vehicules])

  const evenementsCarte = useMemo(
    () => evenements.filter((evt) => evt.statut !== 'CLOTURE'),
    [evenements],
  )

  const interventionsActives = useMemo(
    () => interventions.filter(interventionEstActive),
    [interventions],
  )

  const vehiculesEngages = useMemo<Ressource[]>(() => {
    const mapInterventions = new Map(
      interventionsActives.map((intervention) => [
        intervention.idVehicule,
        intervention,
      ]),
    )
    return vehicules
      .filter((vehicule) => mapInterventions.has(vehicule.id))
      .map((vehicule) => {
        const intervention = mapInterventions.get(vehicule.id)
        return {
          id: vehicule.id,
          nom: vehicule.caserne
            ? `Véhicule ${vehicule.caserne}`
            : `Véhicule ${vehicule.id.slice(0, 8)}`,
          type: 'Véhicule',
          categorie: 'POMPIERS',
          disponibilite: 'OCCUPE',
          latitude: vehicule.latitude,
          longitude: vehicule.longitude,
          statutBrut: intervention?.statusIntervention ?? vehicule.statut,
          plaque: vehicule.plaqueImmat,
          equipements:
            vehicule.equipements?.map((eq) => ({
              nom: eq.nomEquipement,
              contenance: eq.contenanceCourante,
            })) ?? [],
        } as Ressource
      })
  }, [interventionsActives, vehicules])

  const vehiculeFiltreId =
    !isAdmin && isTerrain && vehiculeSuiviId ? vehiculeSuiviId : null

  const vehiculesEngagesFiltres = useMemo(
    () =>
      vehiculeFiltreId
        ? vehiculesEngages.filter((res) => res.id === vehiculeFiltreId)
        : vehiculesEngages,
    [vehiculesEngages, vehiculeFiltreId],
  )

  const missions = useMemo(() => {
    const mapEvenements = new Map(evenementsApi.map((evt) => [evt.id, evt]))
    const mapVehicules = new Map(vehicules.map((veh) => [veh.id, veh]))
    const mapRoutes = new Map(routes.map((route) => [route.id, route]))

    const missionList = interventionsActives
      .map((intervention) => {
        const vehicule = mapVehicules.get(intervention.idVehicule)
        const evenement = mapEvenements.get(intervention.idEvenement)
        if (!vehicule || !evenement) return null
        const key = `${intervention.idVehicule}-${intervention.idEvenement}`
        return {
          id: key,
          vehicule,
          evenement,
          intervention,
          route: mapRoutes.get(key),
        }
      })
      .filter(Boolean) as Array<{
        id: string
        vehicule: VehiculeSnapshot
        evenement: EvenementApi
        intervention: InterventionSnapshot
        route?: TrajetAssocie
      }>
    return missionList
  }, [evenementsApi, interventionsActives, routes, vehicules])

  const missionsFiltrees = useMemo(
    () =>
      vehiculeFiltreId
        ? missions.filter((mission) => mission.vehicule.id === vehiculeFiltreId)
        : missions,
    [missions, vehiculeFiltreId],
  )

  useEffect(() => {
    if (!missionSelectionneeId && missionsFiltrees.length > 0) {
      setMissionSelectionneeId(missionsFiltrees[0].id)
    }
    if (missionSelectionneeId) {
      const existe = missionsFiltrees.some(
        (mission) => mission.id === missionSelectionneeId,
      )
      if (!existe) {
        setMissionSelectionneeId(missionsFiltrees[0]?.id ?? null)
      }
    }
  }, [missionSelectionneeId, missionsFiltrees])

  const ressourcesPourCarte = useMemo(
    () =>
      vehiculesEngagesFiltres.filter((res) =>
        isValidCoord(res.latitude, res.longitude),
      ),
    [vehiculesEngagesFiltres],
  )

  const routesPourCarte = useMemo<RouteTrace[]>(
    () => {
      const mapVehicules = new Map(vehicules.map((veh) => [veh.id, veh]))
      return routes
        .filter((route) => !vehiculeFiltreId || route.idVehicule === vehiculeFiltreId)
        .filter((route) => route.coordinates.length > 1)
        .map((route) => {
          const vehicule = mapVehicules.get(route.idVehicule)
          if (!vehicule) {
            return {
              id: route.id,
              coordinates: route.coordinates,
              color: route.color,
            }
          }
          // Cherche le point de la route le plus proche de la position courante du véhicule.
          let bestIndex = 0
          let bestScore = Number.POSITIVE_INFINITY
          route.coordinates.forEach(([lon, lat], idx) => {
            const dx = lon - vehicule.longitude
            const dy = lat - vehicule.latitude
            const score = dx * dx + dy * dy
            if (score < bestScore) {
              bestScore = score
              bestIndex = idx
            }
          })
          const remaining = route.coordinates.slice(bestIndex) as Array<
            [number, number]
          >
          // Replace le premier point par la position courante pour éviter un "saut".
          const coordinates: Array<[number, number]> =
            remaining.length >= 2
              ? ([[vehicule.longitude, vehicule.latitude] as [number, number], ...remaining.slice(1)])
              : (route.coordinates as Array<[number, number]>)

          return {
            id: route.id,
            coordinates,
            color: route.color,
          }
        })
    },
    [routes, vehiculeFiltreId, vehicules],
  )

  const centrerSurMission = useCallback(
    (mission: {
      vehicule: VehiculeSnapshot
      evenement: EvenementApi
    }) => {
      setPopupVehiculeId(mission.vehicule.id)
      setPopupEvenementId(mission.evenement.id)
      setVue((prev) => ({
        ...prev,
        latitude: (mission.vehicule.latitude + mission.evenement.latitude) / 2,
        longitude: (mission.vehicule.longitude + mission.evenement.longitude) / 2,
        zoom: Math.max(prev.zoom, 12.2),
        transitionDuration: 850,
      }))
    },
    [],
  )

  const onSelectEvenement = (id: string) => {
    setPopupEvenementId(id)
    setPopupVehiculeId(null)
    const evt = evenementsCarte.find((evenement) => evenement.id === id)
    if (evt) {
      setVue((prev) => ({
        ...prev,
        latitude: evt.latitude,
        longitude: evt.longitude,
        zoom: Math.max(prev.zoom, 12.4),
        transitionDuration: 700,
      }))
    }
  }

  const onSelectVehicule = (id: string) => {
    setPopupVehiculeId(id)
    setPopupEvenementId(null)
    const res = ressourcesPourCarte.find((veh) => veh.id === id)
    if (res) {
      setVue((prev) => ({
        ...prev,
        latitude: res.latitude,
        longitude: res.longitude,
        zoom: Math.max(prev.zoom, 12.4),
        transitionDuration: 700,
      }))
    }
  }

  const missionSelectionnee = useMemo(
    () => missionsFiltrees.find((mission) => mission.id === missionSelectionneeId) ?? null,
    [missionSelectionneeId, missionsFiltrees],
  )

  const peutCloturer = useMemo(() => {
    if (!missionSelectionnee) return false
    if (isAdmin) return true
    if (isTerrain && vehiculeSuiviId) {
      return missionSelectionnee.vehicule.id === vehiculeSuiviId
    }
    return false
  }, [isAdmin, isTerrain, missionSelectionnee, vehiculeSuiviId])

  const cloturerIntervention = useCallback(
    async (mission: {
      vehicule: VehiculeSnapshot
      evenement: EvenementApi
    }) => {
      setActionErreur(null)
      setActionMessage(null)
      setActionLoading(true)
      const payload: ClotureInterventionPayload = {
        id_evenement: mission.evenement.id,
        id_vehicule: mission.vehicule.id,
      }
      try {
        await postClotureIntervention(payload)
        setActionMessage('Intervention clôturée.')
        // Optimiste : retirer l’intervention locale + route associée
        setInterventions((prev) =>
          prev.filter(
            (intervention) =>
              !(
                intervention.idEvenement === mission.evenement.id &&
                intervention.idVehicule === mission.vehicule.id
              ),
          ),
        )
        interventionsRef.current = interventionsRef.current.filter(
          (intervention) =>
            !(
              intervention.idEvenement === mission.evenement.id &&
              intervention.idVehicule === mission.vehicule.id
            ),
        )
        const key = `${mission.vehicule.id}-${mission.evenement.id}`
        delete routesRef.current[key]
        setRoutes(Object.values(routesRef.current))
        setMissionSelectionneeId(null)
      } catch (error) {
        setActionErreur(
          error instanceof Error
            ? error.message
            : 'Clôture impossible pour le moment.',
        )
      } finally {
        setActionLoading(false)
      }
    },
    [],
  )

  return (
    <div className="terrain-wrapper">
      <div className="terrain-topline">
        {!isAdmin && (
          <div className="terrain-selection">
            <label htmlFor="vehicule-select">Véhicule suivi</label>
            <select
              id="vehicule-select"
              value={vehiculeSuiviId ?? ''}
              onChange={(e) => setVehiculeSuiviId(e.target.value || null)}
            >
              <option value="">Sélectionner un véhicule</option>
              {vehicules.map((veh) => (
                <option key={veh.id} value={veh.id}>
                  {veh.plaqueImmat ?? veh.id.slice(0, 8)}
                </option>
              ))}
            </select>
            {!vehiculeSuiviId && (
              <p className="muted small">
                Choisissez votre véhicule pour afficher le suivi.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="terrain-grid">
        <section className="terrain-map-card">
          <div className="terrain-map-head">
            <div>
              <p className="muted small">Carte temps réel</p>
              <h3>Trajets vers l&apos;événement assigné</h3>
            </div>
            {etatChargement === 'loading' && (
              <span className="pill-soft">Chargement…</span>
            )}
            {etatChargement === 'error' && (
              <span className="pill-error">{erreurChargement}</span>
            )}
          </div>
          <div className="terrain-map">
            <MapView
              evenements={evenementsCarte}
              ressources={ressourcesPourCarte}
              routes={routesPourCarte}
              evenementSelectionneId={popupEvenementId ?? undefined}
              popupEvenementId={popupEvenementId}
              popupRessourceId={popupVehiculeId}
              statutEvenementParId={statutEvenementParId}
              onSelectEvenement={onSelectEvenement}
              onSelectRessource={onSelectVehicule}
              onClosePopups={() => {
                setPopupEvenementId(null)
                setPopupVehiculeId(null)
              }}
              vue={vue}
              onMove={setVue}
            />
          </div>
          <div className="terrain-legend">
            <span className="legend-chip">
              <span className="legend-dot crit" /> Événement critique
            </span>
            <span className="legend-chip">
              <span className="legend-dot modere" /> Événement majeur
            </span>
            <span className="legend-chip">
              <span className="legend-dot mineur" /> Événement mineur
            </span>
            <span className="legend-chip">
              <span className="legend-line" /> Trajet OSRM
            </span>
            <span className="legend-chip">
              <span className="legend-vehicle" /> Véhicule engagé
            </span>
          </div>
        </section>

        <aside className="terrain-side">
          <div className="terrain-side-counters">
            <div className="terrain-counter">
              <span className="counter-label">Véhicules engagés</span>
              <strong>{ressourcesPourCarte.length}</strong>
              <span className="counter-sub">
                Routes calculées : {routesPourCarte.length}
              </span>
            </div>
            <div className="terrain-counter">
              <span className="counter-label">Événements actifs</span>
              <strong>{missionsFiltrees.length}</strong>
              <span className="counter-sub">
                {missionsFiltrees.length} intervention(s)
              </span>
            </div>
          </div>
          {missionSelectionnee && (
            <div className="terrain-mission-detail">
              <div className="mission-detail-head">
                <div>
              <p className="muted small">
                {missionSelectionnee.intervention.statusIntervention ?? 'Intervention'}
              </p>
              <h4>{missionSelectionnee.evenement.nomTypeEvenement ?? 'Événement'}</h4>
                  <p className="muted small">
                    {missionSelectionnee.evenement.description ?? 'Description indisponible'}
                  </p>
                </div>
                <span className="pill pill-vehicule">
                  {missionSelectionnee.intervention.statusIntervention}
                </span>
              </div>
              <div className="mission-detail-grid">
                <div>
                  <p className="muted small">Véhicule</p>
                  <strong>{missionSelectionnee.vehicule.plaqueImmat ?? missionSelectionnee.vehicule.id.slice(0, 8)}</strong>
                </div>
                <div>
                  <p className="muted small">Distance restante</p>
                  <strong>{formatDistance(missionSelectionnee.route?.distance)}</strong>
                </div>
                <div>
                  <p className="muted small">Durée estimée</p>
                  <strong>{formatDuree(missionSelectionnee.route?.duration)}</strong>
                </div>
              </div>
              {actionErreur && <p className="pill-error">{actionErreur}</p>}
              {actionMessage && <p className="pill-soft">{actionMessage}</p>}
              <div className="mission-detail-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => missionSelectionnee && centrerSurMission({
                    vehicule: missionSelectionnee.vehicule,
                    evenement: missionSelectionnee.evenement,
                  })}
                >
                  Recentrer
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!peutCloturer || actionLoading}
                  onClick={() => missionSelectionnee && cloturerIntervention({
                    vehicule: missionSelectionnee.vehicule,
                    evenement: missionSelectionnee.evenement,
                  })}
                >
                  {actionLoading ? 'Clôture...' : 'Clôturer l’intervention'}
                </button>
              </div>
            </div>
          )}
          <div className="terrain-side-head">
            <div>
              <p className="muted small">Suivi des trajets</p>
              <h4>Véhicules en intervention</h4>
            </div>
          </div>
          <div className="terrain-missions">
            {missionsFiltrees.map((mission) => (
              <button
                key={mission.id}
                type="button"
                className={`terrain-mission ${missionSelectionneeId === mission.id ? 'active' : ''}`}
                onClick={() => {
                  setMissionSelectionneeId(mission.id)
                  centrerSurMission({
                    vehicule: mission.vehicule,
                    evenement: mission.evenement,
                  })
                }}
              >
                <div className="mission-top">
                  <span
                    className="pill pill-vehicule"
                    style={{ background: colorFromId(mission.vehicule.id) }}
                  >
                    {mission.intervention.statusIntervention}
                  </span>
                  <span className="muted small">
                    {mission.vehicule.plaqueImmat ?? 'Plaque indisponible'}
                  </span>
                </div>
                <p className="mission-title">
                  {mission.evenement.nomTypeEvenement ?? 'Événement'}
                </p>
                <p className="muted small">
                  {mission.evenement.description ?? 'Description indisponible'}
                </p>
                <div className="mission-meta">
                  <span>{formatDistance(mission.route?.distance)}</span>
                  <span>{formatDuree(mission.route?.duration)}</span>
                </div>
              </button>
            ))}
            {missionsFiltrees.length === 0 && (
              <p className="muted small">Aucun véhicule en route actuellement.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default TerrainPage
