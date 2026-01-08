import type { VehiculeOperationnel } from '../models/vehicule'
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
