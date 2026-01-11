import type { EquipementReference } from '../models/equipement'
import { parseJson, withBaseUrl } from './api'

export const getEquipements = async (
  signal?: AbortSignal,
): Promise<EquipementReference[]> => {
  const response = await fetch(withBaseUrl('/api/references/equipements'), {
    headers: { Accept: 'application/json' },
    signal,
  })
  return parseJson<EquipementReference[]>(response)
}
