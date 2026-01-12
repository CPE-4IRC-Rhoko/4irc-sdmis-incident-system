const detectOsrmBaseUrl = () => {
  if (typeof import.meta !== 'undefined') {
    const override = import.meta.env.VITE_OSRM_URL as string | undefined
    if (override && override.trim().length > 0) {
      return override.replace(/\/$/, '')
    }
  }
  // Fallback sur l’instance OSRM fournie pour le projet.
  return 'https://api-osrm.4irc.hugorodrigues.fr'
}

const OSRM_BASE_URL = detectOsrmBaseUrl()
const OSRM_FALLBACK_URL = 'https://router.project-osrm.org'

export type OsrmRoute = {
  coordinates: Array<[number, number]>
  distance: number
  duration: number
}

const buildUrl = (
  base: string,
  depart: { latitude: number; longitude: number },
  arrivee: { latitude: number; longitude: number },
): string =>
  `${base}/route/v1/driving/${depart.longitude},${depart.latitude};${arrivee.longitude},${arrivee.latitude}?geometries=geojson&overview=full`

const fetchRouteFrom = async (
  baseUrl: string,
  depart: { latitude: number; longitude: number },
  arrivee: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<OsrmRoute> => {
  const url = buildUrl(baseUrl, depart, arrivee)
  const response = await fetch(url, { signal })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      message?.trim().length
        ? message
        : `Échec récupération OSRM (${response.status})`,
    )
  }

  const payload = await response.json()
  const route = payload?.routes?.[0]
  const coords = route?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length === 0) {
    throw new Error('Réponse OSRM invalide ou itinéraire absent.')
  }

  return {
    coordinates: coords as Array<[number, number]>,
    distance: typeof route?.distance === 'number' ? route.distance : 0,
    duration: typeof route?.duration === 'number' ? route.duration : 0,
  }
}

export const fetchOsrmRoute = async (
  depart: { latitude: number; longitude: number },
  arrivee: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<OsrmRoute> => {
  try {
    return await fetchRouteFrom(OSRM_BASE_URL, depart, arrivee, signal)
  } catch (error) {
    // Tentative de repli sur l’instance publique si la première répond en 5xx.
    if (OSRM_BASE_URL !== OSRM_FALLBACK_URL) {
      try {
        return await fetchRouteFrom(OSRM_FALLBACK_URL, depart, arrivee, signal)
      } catch {
        // L’erreur d’origine est conservée et remontée après le repli raté.
      }
    }
    throw error
  }
}
