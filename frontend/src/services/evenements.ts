import type {
  EvenementApi,
  EvenementCreatePayload,
  EvenementUpdatePayload,
  SeveriteReference,
  TypeEvenementReference,
} from '../models/evenement'
import type { EvenementSnapshot } from './sse'
import { buildAuthHeaders, parseJson, withBaseUrl } from './api'

export const getEvenements = async (
  signal?: AbortSignal,
): Promise<EvenementApi[]> => {
  const response = await fetch(withBaseUrl('/api/evenements'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<EvenementApi[]>(response)
}

export const getSeverites = async (
  signal?: AbortSignal,
): Promise<SeveriteReference[]> => {
  const response = await fetch(withBaseUrl('/api/references/severites'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<SeveriteReference[]>(response)
}

export const getTypesEvenement = async (
  signal?: AbortSignal,
): Promise<TypeEvenementReference[]> => {
  const response = await fetch(withBaseUrl('/api/references/types-evenement'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<TypeEvenementReference[]>(response)
}

export const createEvenement = async (
  payload: EvenementCreatePayload,
): Promise<EvenementApi> => {
  const response = await fetch(withBaseUrl('/api/evenements'), {
    method: 'POST',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  return parseJson<EvenementApi>(response)
}

export const updateEvenement = async (
  id: string,
  payload: EvenementUpdatePayload,
  signal?: AbortSignal,
): Promise<EvenementApi> => {
  const response = await fetch(withBaseUrl(`/api/evenements/${id}`), {
    method: 'PUT',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
    signal,
  })
  return parseJson<EvenementApi>(response)
}

export const getEvenementsSnapshots = async (
  signal?: AbortSignal,
): Promise<EvenementSnapshot[]> => {
  const response = await fetch(withBaseUrl('/api/evenements/snapshots'), {
    headers: buildAuthHeaders(),
    signal,
  })
  return parseJson<EvenementSnapshot[]>(response)
}
