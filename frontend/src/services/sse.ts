import { EventSourcePolyfill } from 'event-source-polyfill'
import { getStoredAccessToken } from './auth'
import { withBaseUrl } from './api'

export type VehiculeSnapshot = {
  id: string
  latitude: number
  longitude: number
  statut: string
  caserne?: string
  equipements?: Array<{ nomEquipement: string; contenanceCourante: number }>
  plaqueImmat?: string
}

export type EvenementSnapshot = {
  idEvenement: string
  description: string
  latitude: number
  longitude: number
  statutEvenement: string
  typeEvenement: string
  severite: string
  echelleSeverite: string
  nbVehiculesNecessaire: number
}

export type InterventionSnapshot = {
  idEvenement: string
  idVehicule: string
  statusIntervention: string
  dateDebutIntervention?: string | null
  dateFinIntervention?: string | null
  plaqueImmat?: string | null
}

type SdmisSseHandlers = {
  onVehicules?: (vehicules: VehiculeSnapshot[]) => void
  onEvenements?: (evenements: EvenementSnapshot[]) => void
  onInterventions?: (interventions: InterventionSnapshot[]) => void
  onError?: (error: Event) => void
}

export const subscribeSdmisSse = (handlers: SdmisSseHandlers) => {
  const token = getStoredAccessToken()
  const url = withBaseUrl('/api/sdmis/sse')
  const es =
    token != null
      ? new EventSourcePolyfill(url, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: false,
          heartbeatTimeout: 120000,
        })
      : new EventSource(url)

  es.addEventListener('vehicules', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as VehiculeSnapshot[]
      handlers.onVehicules?.(data)
    } catch (error) {
      console.error('Erreur de parsing SSE véhicules', error)
    }
  })

  es.addEventListener('evenements', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as EvenementSnapshot[]
      handlers.onEvenements?.(data)
    } catch (error) {
      console.error('Erreur de parsing SSE événements', error)
    }
  })

  es.addEventListener('interventions', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as InterventionSnapshot[]
      handlers.onInterventions?.(data)
    } catch (error) {
      console.error('Erreur de parsing SSE interventions', error)
    }
  })

  es.onerror = (err: Event) => {
    // Ignore idle timeouts from the polyfill; it auto-reconnects.
    if (
      err instanceof MessageEvent &&
      typeof err.data === 'string' &&
      err.data.toLowerCase().includes('no activity within')
    ) {
      return
    }
    if (!token) {
      console.warn('SSE refusé: aucun token présent en session')
    }
    handlers.onError?.(err)
  }

  return es
}
