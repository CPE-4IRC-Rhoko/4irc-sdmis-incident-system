import { buildAuthHeaders, withBaseUrl } from './api'

export interface ValidationPayload {
  id_evenement: string
  vehicules: string[]
}

export const postValidationAffectation = async (
  payload: ValidationPayload,
): Promise<void> => {
  const response = await fetch(withBaseUrl('/api/interventions/validation'), {
    method: 'POST',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      message?.trim().length
        ? message
        : `Appel validation échoué (${response.status})`,
    )
  }

  // Certains endpoints renvoient un corps vide (204). On avale l’absence de JSON.
  const text = await response.text()
  if (!text) return
  try {
    JSON.parse(text)
  } catch {
    // Pas grave : la validation est déjà passée côté API.
  }
}
