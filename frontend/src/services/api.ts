const PROD_API_BASE = 'https://api.4irc.hugorodrigues.fr'

const detectApiBase = () => {
  if (typeof import.meta !== 'undefined') {
    const override = import.meta.env.VITE_API_URL as string | undefined
    if (override && override.length > 0) return override
  }
  return PROD_API_BASE
}

export const API_BASE_URL = detectApiBase()

export const withBaseUrl = (path: string) =>
  `${API_BASE_URL.replace(/\/$/, '')}${path}`

export const parseJson = async <T>(response: Response): Promise<T> => {
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
