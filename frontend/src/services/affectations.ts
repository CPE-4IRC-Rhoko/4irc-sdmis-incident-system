import { parseJson, withBaseUrl } from './api'

export interface ValidationPayload {
  id_evenement: string
  vehicules: string[]
}

export const postValidationAffectation = async (
  payload: ValidationPayload,
): Promise<void> => {
  const response = await fetch(withBaseUrl('/api/interventions/validation'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  await parseJson(response)
}
