import type { CaserneReference } from '../models/caserne'
import { buildAuthHeaders, parseJson, withBaseUrl } from './api'

export const getCasernes = async (
  signal?: AbortSignal,
): Promise<CaserneReference[]> => {
  const response = await fetch(withBaseUrl('/api/references/casernes'), {
    headers: buildAuthHeaders(),
    signal,
  })
  const raw = await parseJson<Array<Record<string, unknown>>>(response)
  return raw.map((row) => {
    const id =
      (row.id as string | undefined) ??
      (row.id_caserne as string | undefined) ??
      (row.idCaserne as string | undefined) ??
      ''
    const nom =
      (row.nom as string | undefined) ??
      (row.nom_de_la_caserne as string | undefined) ??
      (row.nomCaserne as string | undefined) ??
      'Caserne'
    const latitude =
      (row.latitude as number | null | undefined) ??
      (row.lat as number | null | undefined) ??
      (row.latCaserne as number | null | undefined) ??
      null
    const longitude =
      (row.longitude as number | null | undefined) ??
      (row.lon as number | null | undefined) ??
      (row.lng as number | null | undefined) ??
      null

    return {
      id: String(id),
      nom,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    }
  })
}
