import type { EquipementReference } from '../models/equipement'
import { buildAuthHeaders, parseJson, withBaseUrl } from './api'

export const getEquipements = async (
  signal?: AbortSignal,
): Promise<EquipementReference[]> => {
  const response = await fetch(withBaseUrl('/api/references/equipements'), {
    headers: buildAuthHeaders(),
    signal,
  })
  const raw = await parseJson<Array<Record<string, unknown>>>(response)
  return raw.map((row) => {
    const id =
      (row.id as string | undefined) ??
      (row.id_equipement as string | undefined) ??
      (row.idEquipement as string | undefined) ??
      ''
    const nom =
      (row.nom as string | undefined) ??
      (row.nom_equipement as string | undefined) ??
      (row.nomEquipement as string | undefined) ??
      'Équipement'
    return { id: String(id), nom }
  })
}
