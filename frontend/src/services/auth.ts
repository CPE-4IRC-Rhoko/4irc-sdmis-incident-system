const AUTH_FLAG_KEY = 'keycloak-authenticated'
const STATE_KEY = 'keycloak-state'
const TOKEN_KEY = 'keycloak-access-token'
const ROLES_KEY = 'keycloak-roles'
const POST_LOGIN_REDIRECT_KEY = 'keycloak-post-login-redirect'
const CODE_VERIFIER_KEY = 'keycloak-code-verifier'
const CODE_VERIFIER_FALLBACK_KEY = 'keycloak-code-verifier-persist'
const LOGIN_REDIRECT_URI_KEY = 'keycloak-login-redirect-uri'

const isBrowser = () => typeof window !== 'undefined'

const isKeycloakEnabled = () => {
  const flag = (import.meta.env.VITE_ENABLE_KEYCLOAK as string | undefined) ?? 'true'
  return flag !== 'false' && flag !== '0'
}

const requireEnvVar = (key: string) => {
  const value = (import.meta.env[key] as string | undefined)?.trim()
  if (!value) {
    throw new Error(`Variable d'environnement manquante pour Keycloak : ${key}`)
  }
  return value
}

const getAuthConfig = () => {
  if (!isBrowser()) {
    throw new Error('Keycloak nécessite un environnement navigateur')
  }

  const authUrl = requireEnvVar('VITE_KEYCLOAK_AUTH_URL')
  const tokenUrl = requireEnvVar('VITE_KEYCLOAK_TOKEN_URL')
  const clientId = requireEnvVar('VITE_KEYCLOAK_CLIENT_ID')
  const redirectUri = `${window.location.origin}/callback`
  const scope = requireEnvVar('VITE_KEYCLOAK_SCOPE')
  const responseType = requireEnvVar('VITE_KEYCLOAK_RESPONSE_TYPE')

  return { authUrl, tokenUrl, clientId, redirectUri, scope, responseType }
}

const generateState = () => {
  if (!isBrowser()) return ''
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const base64UrlEncode = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const generateCodeVerifier = () => {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return base64UrlEncode(array.buffer)
}

const storeCodeVerifier = (codeVerifier: string) => {
  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier)
  localStorage.setItem(CODE_VERIFIER_FALLBACK_KEY, codeVerifier)
}

const retrieveCodeVerifier = () => {
  const fromSession = sessionStorage.getItem(CODE_VERIFIER_KEY)
  if (fromSession) return fromSession
  return localStorage.getItem(CODE_VERIFIER_FALLBACK_KEY)
}

const clearCodeVerifier = () => {
  sessionStorage.removeItem(CODE_VERIFIER_KEY)
  localStorage.removeItem(CODE_VERIFIER_FALLBACK_KEY)
}

const computeCodeChallenge = async (codeVerifier: string) => {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

const buildLoginUrl = async (state: string) => {
  const { authUrl, clientId, redirectUri, scope, responseType } = getAuthConfig()
  const url = new URL(authUrl)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', responseType)
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  const codeVerifier = generateCodeVerifier()
  storeCodeVerifier(codeVerifier)
  sessionStorage.setItem(LOGIN_REDIRECT_URI_KEY, redirectUri)
  const codeChallenge = await computeCodeChallenge(codeVerifier)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

const cleanAuthParamsFromUrl = () => {
  if (!isBrowser()) return
  const cleanedUrl = new URL(window.location.href)
  const paramsToRemove = [
    'code',
    'state',
    'session_state',
    'access_token',
    'token_type',
    'expires_in',
  ]
  paramsToRemove.forEach((param) => cleanedUrl.searchParams.delete(param))
  cleanedUrl.hash = ''
  window.history.replaceState({}, '', cleanedUrl.toString())
}

const decodeJwtPayload = (token: string) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch (error) {
    console.warn('Impossible de décoder le token Keycloak', error)
    return null
  }
}

const extractRoles = (token: string, clientId: string) => {
  const payload = decodeJwtPayload(token)
  if (!payload) return []

  const realmRoles =
    Array.isArray((payload as { realm_access?: { roles?: string[] } }).realm_access?.roles)
      ? ((payload as { realm_access?: { roles?: string[] } }).realm_access?.roles as string[])
      : []
  const clientRoles =
    Array.isArray(
      (
        payload as {
          resource_access?: Record<string, { roles?: string[] }>
        }
      ).resource_access?.[clientId]?.roles,
    )
      ? (payload as {
          resource_access?: Record<string, { roles?: string[] }>
        }).resource_access?.[clientId]?.roles ?? []
      : []

  return Array.from(new Set([...realmRoles, ...clientRoles]))
}

const exchangeCodeForToken = async (code: string) => {
  const { tokenUrl, clientId, redirectUri } = getAuthConfig()
  const usedRedirectUri =
    sessionStorage.getItem(LOGIN_REDIRECT_URI_KEY) ?? redirectUri
  const codeVerifier = retrieveCodeVerifier()

  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('client_id', clientId)
  body.set('code', code)
  body.set('redirect_uri', usedRedirectUri)
  if (codeVerifier) body.set('code_verifier', codeVerifier)

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      `Echange code->token échoué (${response.status}) : ${message}`,
    )
  }

  return (await response.json()) as {
    access_token?: string
    id_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
  }
}

const redirectToKeycloak = async () => {
  const state = generateState()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, window.location.href)
  const loginUrl = await buildLoginUrl(state)
  window.location.href = loginUrl
}

/**
 * Vérifie l'état d'authentification et déclenche une redirection Keycloak si besoin.
 * - On marque l'utilisateur comme authentifié quand Keycloak nous renvoie avec un code ou un token.
 * - On nettoie l'URL pour éviter de rerentrer dans la boucle de redirection.
 */
export const ensureKeycloakAuth = async () => {
  if (!isBrowser()) {
    return
  }
  if (!isKeycloakEnabled()) {
    return
  }

  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = searchParams.get('code')
  const hasAuthParams =
    code !== null ||
    searchParams.has('session_state') ||
    hashParams.has('access_token')
  const incomingState = searchParams.get('state') ?? hashParams.get('state')
  const storedState = sessionStorage.getItem(STATE_KEY)

  if (hasAuthParams) {
    // Validation du state
    if (storedState && incomingState && storedState !== incomingState) {
      sessionStorage.removeItem(AUTH_FLAG_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(STATE_KEY)
      sessionStorage.removeItem(ROLES_KEY)
      await redirectToKeycloak()
      return
    }

    // Cas 1: Authorization Code Flow (response_type=code)
    if (code) {
      try {
        const tokenResponse = await exchangeCodeForToken(code)
        if (tokenResponse.access_token) {
          sessionStorage.setItem(TOKEN_KEY, tokenResponse.access_token)
          const roles = extractRoles(
            tokenResponse.access_token,
            requireEnvVar('VITE_KEYCLOAK_CLIENT_ID'),
          )
          if (roles.length > 0) {
            sessionStorage.setItem(ROLES_KEY, JSON.stringify(roles))
          } else {
            sessionStorage.removeItem(ROLES_KEY)
          }
        } else {
          sessionStorage.removeItem(ROLES_KEY)
        }
        sessionStorage.setItem(AUTH_FLAG_KEY, 'true')
        sessionStorage.removeItem(STATE_KEY)
        clearCodeVerifier()
        cleanAuthParamsFromUrl()
        return
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Echec échange code->token : ${String(error)}`
        console.error(message)
        // On reste sur place pour inspection, pas de boucle de redirection
        return
      }
    }

    // Cas 2: Implicit Flow (response_type=token)
    const accessToken = hashParams.get('access_token')
    if (accessToken) {
      sessionStorage.setItem(TOKEN_KEY, accessToken)
      const roles = extractRoles(accessToken, requireEnvVar('VITE_KEYCLOAK_CLIENT_ID'))
      if (roles.length > 0) {
        sessionStorage.setItem(ROLES_KEY, JSON.stringify(roles))
      } else {
        sessionStorage.removeItem(ROLES_KEY)
      }
      sessionStorage.setItem(AUTH_FLAG_KEY, 'true')
      sessionStorage.removeItem(STATE_KEY)
      cleanAuthParamsFromUrl()
      return
    }
  }

  // Vérifier si déjà authentifié
  if (sessionStorage.getItem(AUTH_FLAG_KEY) === 'true') {
    if (!sessionStorage.getItem(ROLES_KEY) || !sessionStorage.getItem(TOKEN_KEY)) {
      sessionStorage.removeItem(AUTH_FLAG_KEY)
      await redirectToKeycloak()
      return
    }
    return
  }

  // Pas authentifié, rediriger vers Keycloak
  await redirectToKeycloak()
}

export const getStoredAccessToken = () => {
  if (!isBrowser()) return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export const getStoredRoles = () => {
  if (!isBrowser()) return []
  const raw = sessionStorage.getItem(ROLES_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch (error) {
    console.warn('Impossible de parser les rôles Keycloak', error)
    return []
  }
}

export const processKeycloakCallback = async () => {
  if (!isBrowser()) {
    return
  }
  if (!isKeycloakEnabled()) {
    return
  }

  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const incomingState = searchParams.get('state') ?? hashParams.get('state')
  const storedState = sessionStorage.getItem(STATE_KEY)

  if (storedState && incomingState && storedState !== incomingState) {
    sessionStorage.removeItem(AUTH_FLAG_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(STATE_KEY)
    sessionStorage.removeItem(ROLES_KEY)
    await redirectToKeycloak()
    return
  }

  const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token')
  const code = searchParams.get('code')

  if (accessToken) {
    sessionStorage.setItem(TOKEN_KEY, accessToken)
    const roles = extractRoles(accessToken, requireEnvVar('VITE_KEYCLOAK_CLIENT_ID'))
    if (roles.length > 0) {
      sessionStorage.setItem(ROLES_KEY, JSON.stringify(roles))
      console.info('[auth] roles from access_token (hash)', roles)
    } else {
      sessionStorage.removeItem(ROLES_KEY)
      console.info('[auth] no roles found in hash token')
    }
    sessionStorage.setItem(AUTH_FLAG_KEY, 'true')
    sessionStorage.removeItem(STATE_KEY)
  } else if (code) {
    try {
      const tokenResponse = await exchangeCodeForToken(code)
      if (tokenResponse.access_token) {
        sessionStorage.setItem(TOKEN_KEY, tokenResponse.access_token)
        const roles = extractRoles(
          tokenResponse.access_token,
          requireEnvVar('VITE_KEYCLOAK_CLIENT_ID'),
        )
        if (roles.length > 0) {
          sessionStorage.setItem(ROLES_KEY, JSON.stringify(roles))
        } else {
          sessionStorage.removeItem(ROLES_KEY)
        }
      } else {
        sessionStorage.removeItem(ROLES_KEY)
      }
      sessionStorage.setItem(AUTH_FLAG_KEY, 'true')
      sessionStorage.removeItem(STATE_KEY)
      clearCodeVerifier()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Echec échange code->token : ${String(error)}`
      console.error(message)
      // On reste sur la page pour inspection, pas de boucle
      return
    }
  }

  const target =
    sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) ??
    `${window.location.origin}${window.location.pathname === '/callback' ? '/' : window.location.pathname}`
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  cleanAuthParamsFromUrl()
  window.location.replace(target)
}

export const getAuthDebugSnapshot = () => {
  if (!isBrowser()) return null
  return {
    href: window.location.href,
    state: sessionStorage.getItem(STATE_KEY),
    tokenSample: sessionStorage.getItem(TOKEN_KEY)?.slice(0, 24) ?? null,
    hasToken: !!sessionStorage.getItem(TOKEN_KEY),
    rolesRaw: sessionStorage.getItem(ROLES_KEY),
    authenticated: sessionStorage.getItem(AUTH_FLAG_KEY),
    postLoginRedirect: sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY),
    codeVerifierPresent: !!sessionStorage.getItem(CODE_VERIFIER_KEY),
    codeVerifierFallbackPresent: !!localStorage.getItem(CODE_VERIFIER_FALLBACK_KEY),
    loginRedirectUri: sessionStorage.getItem(LOGIN_REDIRECT_URI_KEY),
  }
}
