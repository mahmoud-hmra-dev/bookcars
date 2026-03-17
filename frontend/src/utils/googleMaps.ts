declare global {
  interface Window {
    google?: any
    __bookcarsGoogleMapsPromise?: Promise<any>
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'bookcars-google-maps-script'
const GOOGLE_MAPS_CALLBACK = '__bookcarsGoogleMapsInit'

export const loadGoogleMapsApi = async (apiKey: string): Promise<any> => {
  if (!apiKey) {
    throw new Error('Google Maps API key is missing.')
  }

  if (window.google?.maps) {
    return window.google.maps
  }

  if (window.__bookcarsGoogleMapsPromise) {
    return window.__bookcarsGoogleMapsPromise
  }

  window.__bookcarsGoogleMapsPromise = new Promise((resolve, reject) => {
    const globalWindow = window as Window & Record<string, any>

    const cleanup = () => {
      delete globalWindow[GOOGLE_MAPS_CALLBACK]
    }

    globalWindow[GOOGLE_MAPS_CALLBACK] = () => {
      cleanup()
      resolve(window.google.maps)
    }

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('error', () => {
        cleanup()
        window.__bookcarsGoogleMapsPromise = undefined
        reject(new Error('Failed to load Google Maps script.'))
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${GOOGLE_MAPS_CALLBACK}`
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
