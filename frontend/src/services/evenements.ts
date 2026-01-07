import type {
  EvenementApi,
  EvenementCreatePayload,
  SeveriteReference,
  TypeEvenementReference,
} from '../models/evenement'

const PROD_API_BASE = 'https://api.4irc.hugorodrigues.fr'

const detectApiBase = () => {
  // 1) override via env (Vite)
  if (typeof import.meta !== 'undefined') {
    const override = import.meta.env.VITE_API_URL as string | undefined
    if (override && override.length > 0) return override
  }

  // 2) default to prod API (HTTPS) to éviter les soucis CORS/dns
  return PROD_API_BASE
}

const API_BASE_URL = detectApiBase()

const withBaseUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/$/, '')}${path}`

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      `Appel API échoué (${response.status}) : ${
        message || response.statusText
      }`,
    )
  }
  return response.json() as Promise<T>
}

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
