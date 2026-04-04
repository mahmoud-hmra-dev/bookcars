declare global {
  interface Window {
    google?: any
    __bookcarsGoogleMapsPromise?: Promise<any>
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'bookcars-google-maps-script'
const GOOGLE_MAPS_CALLBACK = '__bookcarsGoogleMapsInit'

export const loadGoogleMapsApi = (apiKey: string): Promise<any> => {
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing.'))
  }

  // Already loaded — return immediately
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  // Loading in progress — share the same promise (deduplication)
  if (window.__bookcarsGoogleMapsPromise) {
    return window.__bookcarsGoogleMapsPromise
  }

  const globalWindow = window as Window & Record<string, any>

  window.__bookcarsGoogleMapsPromise = new Promise((resolve, reject) => {
    const cleanup = () => {
      delete globalWindow[GOOGLE_MAPS_CALLBACK]
    }

    // This callback is invoked by the Google Maps script once fully ready
    globalWindow[GOOGLE_MAPS_CALLBACK] = () => {
      cleanup()
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        window.__bookcarsGoogleMapsPromise = undefined
        reject(new Error('Google Maps loaded but window.google.maps is undefined'))
      }
    }

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      // Script tag already in DOM (injected by a previous call that lost its promise).
      // If the API is already available synchronously, resolve now.
      if (window.google?.maps) {
        cleanup()
        resolve(window.google.maps)
        return
      }
      // Otherwise wait for the script's load / error events.
      existingScript.addEventListener('load', () => {
        // The `callback=` query param will fire __bookcarsGoogleMapsInit which resolves above,
        // but as a safety net we also resolve here.
        if (window.google?.maps) {
          cleanup()
          resolve(window.google.maps)
        }
      }, { once: true })
      existingScript.addEventListener('error', () => {
        cleanup()
        window.__bookcarsGoogleMapsPromise = undefined
        reject(new Error('Failed to load Google Maps script.'))
      }, { once: true })
      return
    }

    // First call — inject the script tag
    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${GOOGLE_MAPS_CALLBACK}&loading=async`
    script.onerror = () => {
      cleanup()
      window.__bookcarsGoogleMapsPromise = undefined
      reject(new Error('Failed to load Google Maps script.'))
    }

    document.head.appendChild(script)
  })

  return window.__bookcarsGoogleMapsPromise
}

export default loadGoogleMapsApi
