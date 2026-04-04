/**
 * DeliveryLocationPicker
 *
 * Allows the user to choose a custom pickup/delivery point on a map.
 * Calculates the distance from the supplier's office and shows the delivery fee.
 *
 * Props:
 *  - supplierLat / supplierLng  : Supplier office coordinates
 *  - supplierName               : Name of the supplier office
 *  - initialLat / initialLng    : Starting map center (defaults to Beirut)
 *  - onChange(info)             : Called when the user picks or clears a location
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, CircularProgress, Chip, Slider, Tooltip } from '@mui/material'
import {
  MyLocation as MyLocationIcon,
  Store as StoreIcon,
  DirectionsCar as CarIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import env from '@/config/env.config'
import { loadGoogleMapsApi } from '@/utils/googleMaps'

import '@/assets/css/delivery-location-picker.css'

/* ── fee calculation ────────────────────────────────────────────────────────── */
/** Haversine distance in km between two lat/lng pairs */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Delivery fee tiers (USD):
 *  0 – 5 km   : free
 *  5 – 15 km  : $10
 *  15 – 30 km : $20
 *  30 – 60 km : $35
 *  > 60 km    : $60
 */
export function calcDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 5) {
    return 0
  }
  if (distanceKm <= 15) {
    return 10
  }
  if (distanceKm <= 30) {
    return 20
  }
  if (distanceKm <= 60) {
    return 35
  }
  return 60
}

/* ── types ──────────────────────────────────────────────────────────────────── */
export interface DeliveryLocationInfo {
  lat: number
  lng: number
  address: string
  distanceKm: number
  deliveryFee: number
}

interface Props {
  supplierLat: number
  supplierLng: number
  supplierName: string
  initialLat?: number
  initialLng?: number
  currency?: string
  onChange?: (info: DeliveryLocationInfo | null) => void
}

/* ── component ──────────────────────────────────────────────────────────────── */
const DeliveryLocationPicker: React.FC<Props> = ({
  supplierLat,
  supplierLng,
  supplierName,
  initialLat = 33.8938,
  initialLng = 35.5018,
  currency = '$',
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const googleRef = useRef<any>(null)
  const supplierMarkerRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [selected, setSelected] = useState<DeliveryLocationInfo | null>(null)

  /* ── init Google Maps ─────────────────────────────────────────────────────── */
  useEffect(() => {
    loadGoogleMapsApi(env.GOOGLE_MAPS_API_KEY)
      .then((google: any) => {
        googleRef.current = google
        setIsLoaded(true)
      })
      .catch(() => setLoadError(true))
  }, [])

  /* ── build map once API is ready ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) {
      return
    }
    const google = googleRef.current

    const map = new google.Map(mapContainerRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapRef.current = map
    geocoderRef.current = new google.Geocoder()

    // Supplier office marker (green pin)
    supplierMarkerRef.current = new google.Marker({
      position: { lat: supplierLat, lng: supplierLng },
      map,
      title: supplierName,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new google.Size(40, 40),
      },
      zIndex: 2,
    })

    const infoWindow = new google.InfoWindow({
      content: `<div style="font-weight:700;font-size:13px;max-width:180px">${supplierName}<br/><span style="font-weight:400;color:#555">Supplier Office</span></div>`,
    })
    supplierMarkerRef.current.addListener('click', () => {
      infoWindow.open(map, supplierMarkerRef.current)
    })

    // Click on map to place user marker
    map.addListener('click', (e: any) => {
      placeUserMarker(e.latLng.lat(), e.latLng.lng())
    })
  }, [isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── place / move user marker ─────────────────────────────────────────────── */
  const placeUserMarker = useCallback(
    (lat: number, lng: number) => {
      const google = googleRef.current
      const map = mapRef.current
      if (!google || !map) {
        return
      }

      // Remove old marker & polyline
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null)
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
      }

      userMarkerRef.current = new google.Marker({
        position: { lat, lng },
        map,
        title: 'Pickup / Delivery point',
        animation: google.Animation.DROP,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.Size(40, 40),
        },
        zIndex: 3,
        draggable: true,
      })

      // Draw dashed line between supplier and pickup
      polylineRef.current = new google.Polyline({
        path: [
          { lat: supplierLat, lng: supplierLng },
          { lat, lng },
        ],
        geodesic: true,
        strokeColor: '#1B6B4A',
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4, strokeColor: '#1B6B4A' },
            offset: '0',
            repeat: '20px',
          },
        ],
        map,
      })

      // Update on drag
      userMarkerRef.current.addListener('dragend', (e: any) => {
        placeUserMarker(e.latLng.lat(), e.latLng.lng())
      })

      const distanceKm = haversineKm(supplierLat, supplierLng, lat, lng)
      const fee = calcDeliveryFee(distanceKm)

      // Reverse geocode
      geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        const address =
          status === 'OK' && results[0]
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`

        const info: DeliveryLocationInfo = { lat, lng, address, distanceKm, deliveryFee: fee }
        setSelected(info)
        onChange?.(info)
      })
    },
    [supplierLat, supplierLng, onChange],
  )

  /* ── use browser geolocation ──────────────────────────────────────────────── */
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const { latitude: lat, longitude: lng } = pos.coords
        mapRef.current?.setCenter({ lat, lng })
        mapRef.current?.setZoom(14)
        placeUserMarker(lat, lng)
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    )
  }

  /* ── clear selection ──────────────────────────────────────────────────────── */
  const handleClear = () => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
    }
    setSelected(null)
    onChange?.(null)
  }

  /* ── render ───────────────────────────────────────────────────────────────── */
  if (loadError) {
    return (
      <div className="dlp-error">
        Unable to load map. Please check your internet connection.
      </div>
    )
  }

  return (
    <div className="dlp-wrapper">
      {/* Header */}
      <div className="dlp-header">
        <CarIcon className="dlp-header-icon" />
        <div>
          <div className="dlp-header-title">Choose Delivery Location</div>
          <div className="dlp-header-sub">
            Click on the map or use your location — we&apos;ll calculate the delivery fee.
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="dlp-map-container">
        {!isLoaded && (
          <div className="dlp-loading">
            <CircularProgress size={32} sx={{ color: '#1B6B4A' }} />
          </div>
        )}
        <div ref={mapContainerRef} className="dlp-map" />

        {/* Map controls overlay */}
        <div className="dlp-controls">
          <Tooltip title="Use my current location" placement="left">
            <Button
              variant="contained"
              className="dlp-geo-btn"
              onClick={handleGeolocate}
              disabled={geoLoading}
              size="small"
            >
              {geoLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <MyLocationIcon fontSize="small" />}
            </Button>
          </Tooltip>
        </div>

        {/* Legend */}
        <div className="dlp-legend">
          <span className="dlp-legend-item">
            <span className="dlp-dot dlp-dot--green" />
            Supplier office
          </span>
          <span className="dlp-legend-item">
            <span className="dlp-dot dlp-dot--red" />
            Your pickup point
          </span>
        </div>
      </div>

      {/* Fee summary */}
      {selected ? (
        <div className="dlp-summary">
          <div className="dlp-summary-address">
            <MyLocationIcon fontSize="small" className="dlp-summary-icon" />
            <span>{selected.address}</span>
            <Button className="dlp-clear-btn" onClick={handleClear} size="small" color="inherit">
              <CloseIcon fontSize="small" />
            </Button>
          </div>
          <div className="dlp-summary-row">
            <div className="dlp-summary-stat">
              <div className="dlp-stat-label">Distance from office</div>
              <div className="dlp-stat-value">{selected.distanceKm.toFixed(1)} km</div>
            </div>
            <div className="dlp-summary-divider" />
            <div className="dlp-summary-stat">
              <div className="dlp-stat-label">Delivery fee</div>
              <div className={`dlp-stat-value ${selected.deliveryFee === 0 ? 'dlp-free' : 'dlp-fee'}`}>
                {selected.deliveryFee === 0 ? '🎉 Free' : `${currency}${selected.deliveryFee}`}
              </div>
            </div>
          </div>

          {/* Distance-based fee guide */}
          <div className="dlp-fee-guide">
            <InfoIcon fontSize="small" className="dlp-guide-icon" />
            <span>
              Free within 5 km · {currency}10 up to 15 km · {currency}20 up to 30 km · {currency}35 up to 60 km · {currency}60 beyond
            </span>
          </div>
        </div>
      ) : (
        <div className="dlp-hint">
          <StoreIcon fontSize="small" sx={{ color: '#1B6B4A', mr: 0.5 }} />
          Tap anywhere on the map to set your pickup/delivery location.
        </div>
      )}
    </div>
  )
}

export default DeliveryLocationPicker