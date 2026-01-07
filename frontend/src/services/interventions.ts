import type { InterventionApi } from '../models/intervention'
import { parseJson, withBaseUrl } from './api'

export const getInterventions = async (
  signal?: AbortSignal,
): Promise<InterventionApi[]> => {
  const response = await fetch(withBaseUrl('/api/interventions'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<InterventionApi[]>(response)
}
