import type { CaserneReference } from '../models/caserne'
import { parseJson, withBaseUrl } from './api'

export const getCasernes = async (
  signal?: AbortSignal,
): Promise<CaserneReference[]> => {
  const response = await fetch(withBaseUrl('/api/references/casernes'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<CaserneReference[]>(response)
}
