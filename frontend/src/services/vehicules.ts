import type { VehiculeOperationnel } from '../models/vehicule'
import type { VehiculeSnapshot } from './sse'
import { parseJson, withBaseUrl } from './api'

export const getVehiculesOperationnels = async (
  signal?: AbortSignal,
): Promise<VehiculeOperationnel[]> => {
  const response = await fetch(withBaseUrl('/api/vehicules/operationnels'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<VehiculeOperationnel[]>(response)
}

export const getVehiculesSnapshots = async (
  signal?: AbortSignal,
): Promise<VehiculeSnapshot[]> => {
  const response = await fetch(withBaseUrl('/api/vehicules/snapshots'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<VehiculeSnapshot[]>(response)
}
