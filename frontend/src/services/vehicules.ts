import type { VehiculeOperationnel } from '../models/vehicule'
import type { VehiculeSnapshot } from './sse'
import { buildAuthHeaders, parseJson, withBaseUrl } from './api'

export type VehiculeIdent = {
  idVehicule: string
  plaqueImmat: string
  cleIdent: string
}

export type VehiculeCreationPayload = {
  plaqueImmat: string
  cleIdent: string
  idCaserne: string
  equipements: string[]
}

export const getVehiculesOperationnels = async (
  signal?: AbortSignal,
): Promise<VehiculeOperationnel[]> => {
  const response = await fetch(withBaseUrl('/api/vehicules/operationnels'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<VehiculeOperationnel[]>(response)
}

export const getVehiculesSnapshots = async (
  signal?: AbortSignal,
): Promise<VehiculeSnapshot[]> => {
  const response = await fetch(withBaseUrl('/api/vehicules/snapshots'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<VehiculeSnapshot[]>(response)
}

export const getVehiculesIdentifiants = async (
  signal?: AbortSignal,
): Promise<VehiculeIdent[]> => {
  const response = await fetch(withBaseUrl('/api/vehicules/cle-ident'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<VehiculeIdent[]>(response)
}

export const registerVehicule = async (
  payload: VehiculeCreationPayload,
): Promise<string> => {
  const response = await fetch(withBaseUrl('/api/vehicules/register'), {
    method: 'POST',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  return parseJson<string>(response)
}
