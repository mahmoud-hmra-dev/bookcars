import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

let iconsInitialized = false

export const ensureLeafletIcons = () => {
  if (iconsInitialized) {
    return
  }

  const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString()
  const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString()
  const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString()

  const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  L.Marker.prototype.options.icon = defaultIcon
  iconsInitialized = true
}
