import type { InterventionApi } from '../models/intervention'
import type { InterventionSnapshot } from './sse'
import { buildAuthHeaders, parseJson, withBaseUrl } from './api'

export const getInterventions = async (
  signal?: AbortSignal,
): Promise<InterventionApi[]> => {
  const response = await fetch(withBaseUrl('/api/interventions'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<InterventionApi[]>(response)
}

export const getInterventionsSnapshots = async (
  signal?: AbortSignal,
): Promise<InterventionSnapshot[]> => {
  const response = await fetch(withBaseUrl('/api/interventions/snapshots'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<InterventionSnapshot[]>(response)
}

export interface ClotureInterventionPayload {
  id_evenement: string
  id_vehicule: string
}

export const postClotureIntervention = async (
  payload: ClotureInterventionPayload,
): Promise<void> => {
  const response = await fetch(withBaseUrl('/api/interventions/cloture'), {
    method: 'POST',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      message?.trim().length
        ? message
        : `Clôture intervention échouée (${response.status})`,
    )
  }
}
