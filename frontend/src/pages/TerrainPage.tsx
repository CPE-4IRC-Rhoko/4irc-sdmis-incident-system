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
import { getInterventionsSnapshots } from '../services/interventions'
import { getVehiculesSnapshots } from '../services/vehicules'
import { fetchOsrmRoute } from '../services/osrm'
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
  const [etatChargement, setEtatChargement] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)

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

  const missions = useMemo(() => {
    const mapEvenements = new Map(evenementsApi.map((evt) => [evt.id, evt]))
    const mapVehicules = new Map(vehicules.map((veh) => [veh.id, veh]))
    const mapRoutes = new Map(routes.map((route) => [route.id, route]))

    return interventionsActives
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
  }, [evenementsApi, interventionsActives, routes, vehicules])

  const ressourcesPourCarte = useMemo(
    () =>
      vehiculesEngages.filter((res) =>
        isValidCoord(res.latitude, res.longitude),
      ),
    [vehiculesEngages],
  )

  const routesPourCarte = useMemo<RouteTrace[]>(
    () =>
      routes
        .filter((route) => route.coordinates.length > 1)
        .map((route) => ({
          id: route.id,
          coordinates: route.coordinates,
          color: route.color,
        })),
    [routes],
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

  return (
    <div className="terrain-wrapper">
      <div className="terrain-topline">
        <div>
          <p className="muted small">Surveillance terrain</p>
          <h2>Carte admin temps réel</h2>
        </div>
        <div className="terrain-counters">
          <div className="terrain-counter">
            <span className="counter-label">Véhicules engagés</span>
            <strong>{ressourcesPourCarte.length}</strong>
            <span className="counter-sub">
              Routes calculées : {routesPourCarte.length}
            </span>
          </div>
          <div className="terrain-counter">
            <span className="counter-label">Événements actifs</span>
            <strong>{evenementsCarte.length}</strong>
            <span className="counter-sub">
              {interventionsActives.length} intervention(s)
            </span>
          </div>
        </div>
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
          <div className="terrain-side-head">
            <div>
              <p className="muted small">Suivi des trajets</p>
              <h4>Véhicules en intervention</h4>
            </div>
          </div>
          <div className="terrain-missions">
            {missions.map((mission) => (
              <button
                key={mission.id}
                type="button"
                className="terrain-mission"
                onClick={() =>
                  centrerSurMission({
                    vehicule: mission.vehicule,
                    evenement: mission.evenement,
                  })
                }
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
            {missions.length === 0 && (
              <p className="muted small">Aucun véhicule en route actuellement.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default TerrainPage
