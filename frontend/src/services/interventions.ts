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
