/**
 * OfficeLocationPicker
 *
 * An interactive Google Map that lets admin/supplier click to set their office coordinates.
 * Shows a draggable marker and a reverse-geocoded address.
 * Emits { lat, lng, address } via onChange.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api'
import {
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import {
  MyLocation as MyLocationIcon,
  LocationOn as LocationOnIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import env from '@/config/env.config'

import '@/assets/css/office-location-picker.css'

/* ── types ───────────────────────────────────────────────── */
export interface OfficeLocationInfo {
  lat: number
  lng: number
  address: string
}

interface Props {
  /** Pre-selected coordinates (e.g. from DB) */
  initialLat?: number
  initialLng?: number
  /** Called whenever the marker moves or is cleared */
  onChange?: (info: OfficeLocationInfo | null) => void
}

/* ── helpers ─────────────────────────────────────────────── */
const BEIRUT = { lat: 33.8938, lng: 35.5018 }
const CONTAINER_STYLE = { width: '100%', height: '320px' }
const LIBRARIES: ('places' | 'geocoding')[] = ['places']

/* ── component ───────────────────────────────────────────── */
const OfficeLocationPicker: React.FC<Props> = ({
  initialLat,
  initialLng,
  onChange,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const [marker, setMarker] = useState<google.maps.LatLngLiteral | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  )
  const [address, setAddress] = useState<string>('')
  const [geoLoading, setGeoLoading] = useState(false)

  /* Build geocoder once map is loaded */
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    geocoderRef.current = new window.google.maps.Geocoder()
  }, [])

  /* Resolve initial coords to an address */
  useEffect(() => {
    if (initialLat && initialLng && isLoaded) {
      reverseGeocode({ lat: initialLat, lng: initialLng })
    }
  }, [isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const reverseGeocode = useCallback(
    (pos: google.maps.LatLngLiteral) => {
      if (!geocoderRef.current) {
        return
      }
      geocoderRef.current.geocode({ location: pos }, (results, status) => {
        const addr =
          status === 'OK' && results?.[0]
            ? results[0].formatted_address
            : `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
        setAddress(addr)
        onChange?.({ lat: pos.lat, lng: pos.lng, address: addr })
      })
    },
    [onChange],
  )

  const placeMarker = useCallback(
    (pos: google.maps.LatLngLiteral) => {
      setMarker(pos)
      reverseGeocode(pos)
    },
    [reverseGeocode],
  )

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        placeMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      }
    },
    [placeMarker],
  )

  const handleMarkerDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        placeMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      }
    },
    [placeMarker],
  )

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapRef.current?.setCenter(p)
        mapRef.current?.setZoom(15)
        placeMarker(p)
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    )
  }

  const handleClear = () => {
    setMarker(null)
    setAddress('')
    onChange?.(null)
  }

  if (loadError) {
    return (
      <div className="olp-error">
        Unable to load map. Check your Google Maps API key.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="olp-loading">
        <CircularProgress size={28} sx={{ color: '#1B6B4A' }} />
        <span>Loading map…</span>
      </div>
    )
  }

  return (
    <div className="olp-wrapper">
      {/* Header */}
      <div className="olp-header">
        <LocationOnIcon className="olp-header-icon" />
        <div>
          <div className="olp-header-title">Office Location on Map</div>
          <div className="olp-header-sub">Click the map or drag the pin to set your office coordinates.</div>
        </div>
      </div>

      {/* Map */}
      <div className="olp-map-container">
        <GoogleMap
          mapContainerStyle={CONTAINER_STYLE}
          center={marker || BEIRUT}
          zoom={marker ? 14 : 11}
          onClick={handleMapClick}
          onLoad={onMapLoad}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          {marker && (
            <MarkerF
              position={marker}
              draggable
              onDragEnd={handleMarkerDrag}
              animation={window.google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>

        {/* Controls overlay */}
        <div className="olp-controls">
          <Tooltip title="Use my current location" placement="left">
            <Button className="olp-geo-btn" onClick={handleGeolocate} disabled={geoLoading} variant="contained" size="small">
              {geoLoading
                ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                : <MyLocationIcon fontSize="small" />}
            </Button>
          </Tooltip>
          {marker && (
            <Tooltip title="Clear location" placement="left">
              <Button className="olp-clear-btn" onClick={handleClear} variant="contained" size="small">
                <CloseIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Coordinate + address display */}
      {marker ? (
        <div className="olp-coords">
          <div className="olp-coords-row">
            <span className="olp-coords-label">Latitude</span>
            <span className="olp-coords-value">{marker.lat.toFixed(6)}</span>
            <span className="olp-coords-sep" />
            <span className="olp-coords-label">Longitude</span>
            <span className="olp-coords-value">{marker.lng.toFixed(6)}</span>
          </div>
          {address && (
            <div className="olp-coords-address">
              <LocationOnIcon fontSize="small" sx={{ color: '#1B6B4A', mr: 0.5, flexShrink: 0 }} />
              {address}
            </div>
          )}
        </div>
      ) : (
        <div className="olp-coords-hint">
          No office location set. Click the map to place a pin.
        </div>
      )}
    </div>
  )
}

export default OfficeLocationPicker