import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/map'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/utils/helper'
import { loadGoogleMapsApi } from '@/utils/googleMaps'

import '@/assets/css/map.css'

type LatLngLiteral = {
  lat: number
  lng: number
}

type MapMarker = {
  key: string
  name: string
  position: LatLngLiteral
  locationId?: string
  isPickupSelectable?: boolean
}

interface MapProps {
  title?: string
  position?: LatLngLiteral | [number, number]
  initialZoom?: number
  locations?: bookcarsTypes.Location[]
  parkingSpots?: bookcarsTypes.ParkingSpot[]
  className?: string
  children?: ReactNode
  onSelelectPickUpLocation?: (locationId: string) => void
}

const DEFAULT_POSITION: LatLngLiteral = {
  lat: 31.792305849269,
  lng: -7.080168000000015,
}

const isFiniteCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const toLatLngLiteral = (value?: LatLngLiteral | [number, number] | null): LatLngLiteral => {
  if (!value) {
    return DEFAULT_POSITION
  }

  if (Array.isArray(value)) {
    const [lat, lng] = value
    return {
      lat: Number(lat),
      lng: Number(lng),
    }
  }

  return {
    lat: Number(value.lat),
    lng: Number(value.lng),
  }
}

const Map = ({
  title,
  position,
  initialZoom,
  locations,
  parkingSpots,
  className,
  children,
  onSelelectPickUpLocation,
}: MapProps) => {
  const _initialZoom = initialZoom || 5.5
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const googleMapsRef = useRef<any>(null)
  const infoWindowRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const center = useMemo(() => toLatLngLiteral(position), [position])

  const locationMarkers = useMemo<MapMarker[]>(() => (
    (locations || [])
      .filter((location) => isFiniteCoordinate(location.latitude) && isFiniteCoordinate(location.longitude))
      .map((location) => ({
        key: location._id,
        name: location.name || '',
        locationId: location._id,
        position: {
          lat: Number(location.latitude),
          lng: Number(location.longitude),
        },
        isPickupSelectable: !!onSelelectPickUpLocation,
      }))
  ), [locations, onSelelectPickUpLocation])

  const parkingSpotMarkers = useMemo<MapMarker[]>(() => (
    (parkingSpots || [])
      .filter((parkingSpot) => Number.isFinite(Number(parkingSpot.latitude)) && Number.isFinite(Number(parkingSpot.longitude)))
      .map((parkingSpot, index) => ({
        key: parkingSpot._id || `parking-spot-${index}`,
        name: parkingSpot.name || '',
        position: {
          lat: Number(parkingSpot.latitude),
          lng: Number(parkingSpot.longitude),
        },
      }))
  ), [parkingSpots])

  useEffect(() => {
    let cancelled = false

    const initMap = async () => {
      if (!env.GOOGLE_MAPS_API_KEY) {
        setLoadError(true)
        return
      }

      try {
        const googleMaps = await loadGoogleMapsApi(env.GOOGLE_MAPS_API_KEY)
        if (cancelled || !mapContainerRef.current) {
          return
        }

        googleMapsRef.current = googleMaps

        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapContainerRef.current, {
            center,
            zoom: _initialZoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: 'cooperative',
          })
          infoWindowRef.current = new googleMaps.InfoWindow()
        }

        setIsLoaded(true)
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setLoadError(true)
        }
      }
    }

    initMap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !googleMapsRef.current) {
      return
    }

    mapRef.current.setCenter(center)
    mapRef.current.setZoom(_initialZoom)

    window.setTimeout(() => {
      if (!mapRef.current || !googleMapsRef.current) {
        return
      }

      const currentCenter = mapRef.current.getCenter()
      googleMapsRef.current.event.trigger(mapRef.current, 'resize')
      if (currentCenter) {
        mapRef.current.setCenter(currentCenter)
      }
    }, 0)
  }, [_initialZoom, center, center.lat, center.lng, isLoaded])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !googleMapsRef.current) {
      return
    }

    const googleMaps = googleMapsRef.current
    const map = mapRef.current

    infoWindowRef.current?.close()
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    const resolveLocationId = async (marker: MapMarker) => {
      if (marker.locationId) {
        return marker.locationId
      }

      const { status, data } = await LocationService.getLocationId(marker.name, 'en')
      if (status !== 200) {
        throw new Error('Unable to resolve location id.')
      }

      return data
    }

    const buildInfoWindowContent = (marker: MapMarker) => {
      const container = document.createElement('div')
      container.className = 'marker'

      const name = document.createElement('div')
      name.className = 'name'
      name.textContent = marker.name
      container.appendChild(name)

      if (marker.isPickupSelectable && onSelelectPickUpLocation) {
        const action = document.createElement('div')
        action.className = 'action'

        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'action-btn'
        button.textContent = strings.SELECT_PICK_UP_LOCATION
        button.onclick = () => {
          button.disabled = true
          void (async () => {
            try {
              const locationId = await resolveLocationId(marker)
              onSelelectPickUpLocation(locationId)
            } catch (err) {
              helper.error(err)
              button.disabled = false
            }
          })()
        }

        action.appendChild(button)
        container.appendChild(action)
      }

      return container
    }

    const createMarker = (marker: MapMarker) => {
      const instance = new googleMaps.Marker({
        position: marker.position,
        map,
        title: marker.name,
      })

      instance.addListener('click', () => {
        if (!infoWindowRef.current) {
          return
        }

        infoWindowRef.current.setContent(buildInfoWindowContent(marker))
        infoWindowRef.current.open({
          anchor: instance,
          map,
        })
      })

      markersRef.current.push(instance)
    }

    locationMarkers.forEach(createMarker)
    parkingSpotMarkers.forEach(createMarker)

    return () => {
      infoWindowRef.current?.close()
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [isLoaded, locationMarkers, parkingSpotMarkers, onSelelectPickUpLocation])

  return (
    <>
      {title && <h1 className="title">{title}</h1>}
      <div className={`${className ? `${className} ` : ''}map`}>
        <div ref={mapContainerRef} className="map-canvas" />
        {children}
        {!isLoaded && (
          <div className={`map-status ${loadError ? 'map-status-error' : ''}`}>
            {loadError ? 'Google Maps is unavailable.' : commonStrings.LOADING}
          </div>
        )}
      </div>
    </>
  )
}

export default Map
