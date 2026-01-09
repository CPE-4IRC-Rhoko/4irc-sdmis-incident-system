import type {
  EvenementApi,
  EvenementCreatePayload,
  SeveriteReference,
  TypeEvenementReference,
} from '../models/evenement'
import type { EvenementSnapshot } from './sse'
import { parseJson, withBaseUrl } from './api'

export const getEvenements = async (
  signal?: AbortSignal,
): Promise<EvenementApi[]> => {
  const response = await fetch(withBaseUrl('/api/evenements'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<EvenementApi[]>(response)
}

export const getSeverites = async (
  signal?: AbortSignal,
): Promise<SeveriteReference[]> => {
  const response = await fetch(
    withBaseUrl('/api/references/severites'),
    { headers: { Accept: 'application/json' }, signal },
  )
  return parseJson<SeveriteReference[]>(response)
}

export const getTypesEvenement = async (
  signal?: AbortSignal,
): Promise<TypeEvenementReference[]> => {
  const response = await fetch(
    withBaseUrl('/api/references/types-evenement'),
    { headers: { Accept: 'application/json' }, signal },
  )
  return parseJson<TypeEvenementReference[]>(response)
}

export const createEvenement = async (
  payload: EvenementCreatePayload,
): Promise<EvenementApi> => {
  const response = await fetch(withBaseUrl('/api/evenements'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  return parseJson<EvenementApi>(response)
}

export const getEvenementsSnapshots = async (
  signal?: AbortSignal,
): Promise<EvenementSnapshot[]> => {
  const response = await fetch(withBaseUrl('/api/evenements/snapshots'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<EvenementSnapshot[]>(response)
}
