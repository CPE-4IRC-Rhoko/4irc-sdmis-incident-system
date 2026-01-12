const detectOsrmBaseUrl = () => {
  if (typeof import.meta !== 'undefined') {
    const override = import.meta.env.VITE_OSRM_URL as string | undefined
    if (override && override.trim().length > 0) {
      return override.replace(/\/$/, '')
    }
  }
  // Fallback public OSRM; à surcharger avec l'URL utilisée par la simulation (ex: http://localhost:5000).
  return 'https://router.project-osrm.org'
}

const OSRM_BASE_URL = detectOsrmBaseUrl()

export type OsrmRoute = {
  coordinates: Array<[number, number]>
  distance: number
  duration: number
}

export const fetchOsrmRoute = async (
  depart: { latitude: number; longitude: number },
  arrivee: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<OsrmRoute> => {
  const url = `${OSRM_BASE_URL}/route/v1/driving/${depart.longitude},${depart.latitude};${arrivee.longitude},${arrivee.latitude}?geometries=geojson&overview=full`
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
