export type Auth0FlowMode = 'signin' | 'signup'

const AUTH0_RETURN_TO_KEY = 'bc-auth0-return-to'

export const getCurrentRoute = () => {
  const route = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return route || '/'
}

export const setAuth0ReturnTo = (returnTo: string) => {
  sessionStorage.setItem(AUTH0_RETURN_TO_KEY, returnTo || '/')
}

export const clearAuth0ReturnTo = () => {
  sessionStorage.removeItem(AUTH0_RETURN_TO_KEY)
}

export const consumeAuth0ReturnTo = (fallback = '/') => {
  const returnTo = sessionStorage.getItem(AUTH0_RETURN_TO_KEY) || fallback
  clearAuth0ReturnTo()

  if (!returnTo || returnTo === '/auth/callback') {
    return fallback
  }

  return returnTo
}

export const buildAuth0LoginOptions = (mode: Auth0FlowMode, connection?: string, returnTo = getCurrentRoute()) => ({
  appState: {
    returnTo,
  },
  authorizationParams: {
    ...(connection ? { connection } : {}),
    ...(!connection && mode === 'signup' ? { screen_hint: 'signup' as const } : {}),
  },
})
