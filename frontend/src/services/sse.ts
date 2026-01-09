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
  const es = new EventSource(withBaseUrl('/api/sdmis/sse'))

  es.addEventListener('vehicules', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as VehiculeSnapshot[]
      handlers.onVehicules?.(data)
    } catch (error) {
      console.error('Erreur de parsing SSE véhicules', error)
    }
  })

  es.addEventListener('evenements', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as EvenementSnapshot[]
      handlers.onEvenements?.(data)
    } catch (error) {
      console.error('Erreur de parsing SSE événements', error)
    }
  })

  es.addEventListener('interventions', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as InterventionSnapshot[]
      handlers.onInterventions?.(data)
    } catch (error) {
      console.error('Erreur de parsing SSE interventions', error)
    }
  })

  es.onerror = (err) => {
    handlers.onError?.(err)
  }

  return es
}
