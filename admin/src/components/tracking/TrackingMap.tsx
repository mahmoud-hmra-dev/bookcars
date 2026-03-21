import React, { useEffect, useMemo, useRef } from 'react'
import {
  CircleF,
  DrawingManager,
  GoogleMap,
  MarkerClustererF,
  MarkerF,
  PolygonF,
  PolylineF,
  RectangleF,
  useJsApiLoader,
} from '@react-google-maps/api'
import env from '@/config/env.config'
import type {
  DraftGeofenceShape,
  FleetVehicle,
  GeofenceEditorType,
  LatLngTuple,
  ParsedGeofence,
  TrackingMapType,
} from './types'
import {
  DEFAULT_CENTER,
  GOOGLE_MAP_LIBRARIES,
  extractGeoJsonPaths,
  fromGoogleLatLng,
  fromGooglePath,
  getStatusColor,
  toGoogleLatLng,
} from './utils'

type TrackingMapProps = {
  vehicles: FleetVehicle[]
  selectedVehicle: FleetVehicle | null
  routePathPoints: LatLngTuple[]
  playbackPoint: LatLngTuple | null
  playbackHeading: number | null
  geofenceShapes: ParsedGeofence[]
  draftGeofence: DraftGeofenceShape | null
  drawingMode: GeofenceEditorType | null
  mapType: TrackingMapType
  clustersEnabled: boolean
  focusMode: 'fleet' | 'selected'
  fitToken: number
  onMarkerClick: (carId: string) => void
  onDraftGeofenceChange: (draft: DraftGeofenceShape) => void
  onDraftGeofenceDrawn: (draft: DraftGeofenceShape) => void
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#08111f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7f91ae' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08111f' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#162133' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#0a1628' }] },
  { featureType: 'poi', elementType: 'geometry.fill', stylers: [{ color: '#0f1b2e' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#0b2519' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#14233b' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1a2f4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#223c66' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#13253d' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#04111d' }] },
]

const buildClusterSvgUrl = (size: number, fillColor: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="rgba(15,23,42,0.26)"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) - 4}" fill="${fillColor}" />
        <circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) - 12}" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.24)" stroke-width="2" />
      </g>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const buildStatusMarkerSvgUrl = (color: string, selected: boolean) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(8,17,31,0.42)"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <circle cx="28" cy="28" r="${selected ? 18 : 15}" fill="${color}" opacity="${selected ? 0.22 : 0.12}" />
        <circle cx="28" cy="28" r="${selected ? 11 : 9}" fill="${color}" stroke="${selected ? '#ffffff' : color}" stroke-width="${selected ? 3 : 1}" />
      </g>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const buildVehicleSvgUrl = (bodyColor: string, accentColor: string, rotation: number) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(15,23,42,0.35)"/>
        </filter>
      </defs>
      <g transform="rotate(${rotation} 36 36)" filter="url(#shadow)">
        <path d="M36 7C24 7 17 15 17 25v21c0 6 5 11 11 11h16c6 0 11-5 11-11V25C55 15 48 7 36 7Z" fill="${bodyColor}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M27 17h18c4 0 7 3 7 7v8H20v-8c0-4 3-7 7-7Z" fill="${accentColor}" fill-opacity="0.95"/>
        <path d="M24 37h24v8c0 3-3 6-6 6H30c-3 0-6-3-6-6v-8Z" fill="#ffffff" fill-opacity="0.18"/>
        <circle cx="28" cy="47" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        <circle cx="44" cy="47" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        <path d="M36 6l7 10H29L36 6Z" fill="#ffffff" fill-opacity="0.9"/>
      </g>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const TrackingMap = ({
  vehicles,
  selectedVehicle,
  routePathPoints,
  playbackPoint,
  playbackHeading,
  geofenceShapes,
  draftGeofence,
  drawingMode,
  mapType,
  clustersEnabled,
  focusMode,
  fitToken,
  onMarkerClick,
  onDraftGeofenceChange,
  onDraftGeofenceDrawn,
}: TrackingMapProps) => {
  const { isLoaded } = useJsApiLoader({
    id: 'bookcars-tracking-map',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const draftCircleRef = useRef<google.maps.Circle | null>(null)
  const draftPolygonRef = useRef<google.maps.Polygon | null>(null)
  const draftPolylineRef = useRef<google.maps.Polyline | null>(null)
  const draftPolylineListenersRef = useRef<google.maps.MapsEventListener[]>([])
  const googleMaps = globalThis.google?.maps

  const selectedPoint = playbackPoint || selectedVehicle?.point || null
  const visibleVehicles = useMemo(() => vehicles.filter((item) => item.point), [vehicles])

  const clearDraftPolylineListeners = () => {
    draftPolylineListenersRef.current.forEach((listener) => listener.remove())
    draftPolylineListenersRef.current = []
  }

  useEffect(() => () => clearDraftPolylineListeners(), [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !googleMaps) {
      return
    }

    const bounds = new googleMaps.LatLngBounds()
    let hasBounds = false
    let pointCount = 0

    const extend = (point: LatLngTuple) => {
      bounds.extend(toGoogleLatLng(point))
      hasBounds = true
      pointCount += 1
    }

    if (focusMode === 'selected' && selectedVehicle) {
      if (selectedPoint) {
        extend(selectedPoint)
      }

      routePathPoints.forEach(extend)

      geofenceShapes.forEach((shape) => {
        if (shape.center) {
          extend(shape.center)
        }
        shape.points?.forEach(extend)
        if (shape.bounds) {
          extend(shape.bounds[0])
          extend(shape.bounds[1])
        }
        if (shape.geojson) {
          extractGeoJsonPaths(shape.geojson).forEach((ring) => ring.forEach(extend))
        }
      })

      if (draftGeofence?.type === 'circle') {
        extend(draftGeofence.center)
      } else {
        draftGeofence?.points.forEach(extend)
      }
    } else {
      visibleVehicles.forEach((vehicle) => vehicle.point && extend(vehicle.point))
    }

    if (!hasBounds) {
      map.setCenter(toGoogleLatLng(DEFAULT_CENTER))
      map.setZoom(10)
      return
    }

    if (pointCount <= 1 && selectedPoint) {
      map.panTo(toGoogleLatLng(selectedPoint))
      map.setZoom(14)
      return
    }

    map.fitBounds(bounds, 80)
  }, [draftGeofence, fitToken, focusMode, geofenceShapes, googleMaps, routePathPoints, selectedPoint, selectedVehicle, visibleVehicles])

  if (!env.GOOGLE_MAPS_API_KEY) {
    return <div className="tracking-google-map-fallback">Google Maps API key is missing.</div>
  }

  if (!isLoaded || !googleMaps) {
    return <div className="tracking-google-map-fallback">Loading map...</div>
  }

  const syncDraftCircle = () => {
    const circle = draftCircleRef.current
    const center = circle?.getCenter()
    const radius = circle?.getRadius()
    if (!circle || !center || typeof radius !== 'number' || !Number.isFinite(radius)) {
      return
    }

    onDraftGeofenceChange({ type: 'circle', center: fromGoogleLatLng(center), radius })
  }

  const syncDraftPolygon = (polygon?: google.maps.Polygon | null) => {
    const instance = polygon || draftPolygonRef.current
    if (!instance) {
      return
    }

    onDraftGeofenceChange({ type: 'polygon', points: fromGooglePath(instance.getPath()) })
  }

  const syncDraftPolyline = () => {
    const polyline = draftPolylineRef.current
    if (!polyline) {
      return
    }

    onDraftGeofenceChange({ type: 'polyline', points: fromGooglePath(polyline.getPath()) })
  }

  const attachDraftPolylineListeners = (polyline: google.maps.Polyline) => {
    clearDraftPolylineListeners()
    const path = polyline.getPath()
    draftPolylineListenersRef.current = [
      googleMaps.event.addListener(path, 'insert_at', syncDraftPolyline),
      googleMaps.event.addListener(path, 'remove_at', syncDraftPolyline),
      googleMaps.event.addListener(path, 'set_at', syncDraftPolyline),
    ]
  }

  const drawingOptions = {
    circleOptions: {
      clickable: false,
      editable: false,
      fillColor: '#fb923c',
      fillOpacity: 0.16,
      strokeColor: '#f97316',
      strokeWeight: 3,
    },
    polygonOptions: {
      clickable: false,
      editable: false,
      fillColor: '#fb923c',
      fillOpacity: 0.16,
      strokeColor: '#f97316',
      strokeWeight: 3,
    },
    polylineOptions: {
      clickable: false,
      editable: false,
      strokeColor: '#f97316',
      strokeWeight: 4,
      strokeOpacity: 0.95,
    },
    drawingControl: false,
  } satisfies google.maps.drawing.DrawingManagerOptions

  const clusterStyles = [
    {
      url: buildClusterSvgUrl(56, '#0f172a'),
      height: 56,
      width: 56,
      textColor: '#ffffff',
      textSize: 15,
    },
    {
      url: buildClusterSvgUrl(64, '#1d4ed8'),
      height: 64,
      width: 64,
      textColor: '#ffffff',
      textSize: 16,
    },
    {
      url: buildClusterSvgUrl(72, '#0f766e'),
      height: 72,
      width: 72,
      textColor: '#ffffff',
      textSize: 18,
    },
  ]

  const selectedVehicleIcon: google.maps.Icon | null = selectedPoint
    ? {
        url: buildVehicleSvgUrl('#0f172a', '#60a5fa', playbackHeading || 0),
        scaledSize: new googleMaps.Size(44, 44),
        anchor: new googleMaps.Point(22, 22),
      }
    : null

  const renderMarker = (vehicle: FleetVehicle, clusterer?: any) => {
    const point = vehicle.car._id === selectedVehicle?.car._id && selectedPoint ? selectedPoint : vehicle.point
    if (!point) {
      return null
    }

    const isSelected = vehicle.car._id === selectedVehicle?.car._id
    const icon: google.maps.Icon = isSelected && selectedVehicleIcon
      ? selectedVehicleIcon
      : {
          url: buildStatusMarkerSvgUrl(getStatusColor(vehicle.status), isSelected),
          scaledSize: new googleMaps.Size(isSelected ? 38 : 30, isSelected ? 38 : 30),
          anchor: new googleMaps.Point(isSelected ? 19 : 15, isSelected ? 19 : 15),
        }

    return (
      <MarkerF
        key={vehicle.car._id}
        clusterer={clusterer}
        position={toGoogleLatLng(point)}
        title={vehicle.car.name}
        icon={icon}
        zIndex={isSelected ? 100 : vehicle.status === 'moving' ? 80 : 40}
        onClick={() => onMarkerClick(vehicle.car._id)}
      />
    )
  }

  return (
    <GoogleMap
      mapContainerClassName="tracking-google-map"
      center={toGoogleLatLng(DEFAULT_CENTER)}
      zoom={10}
      onLoad={(map) => {
        mapRef.current = map
      }}
      options={{
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
        mapTypeId: mapType,
        styles: mapType === 'roadmap' ? DARK_MAP_STYLES : undefined,
      }}
    >
      {drawingMode && (
        <DrawingManager
          drawingMode={drawingMode === 'circle'
            ? googleMaps.drawing.OverlayType.CIRCLE
            : drawingMode === 'polygon'
              ? googleMaps.drawing.OverlayType.POLYGON
              : googleMaps.drawing.OverlayType.POLYLINE}
          options={drawingOptions}
          onCircleComplete={(circle) => {
            const center = circle.getCenter()
            const radius = circle.getRadius()
            circle.setMap(null)
            if (center && Number.isFinite(radius)) {
              onDraftGeofenceDrawn({ type: 'circle', center: fromGoogleLatLng(center), radius })
            }
          }}
          onPolygonComplete={(polygon) => {
            const points = fromGooglePath(polygon.getPath())
            polygon.setMap(null)
            if (points.length >= 3) {
              onDraftGeofenceDrawn({ type: 'polygon', points })
            }
          }}
          onPolylineComplete={(polyline) => {
            const points = fromGooglePath(polyline.getPath())
            polyline.setMap(null)
            if (points.length >= 2) {
              onDraftGeofenceDrawn({ type: 'polyline', points })
            }
          }}
        />
      )}

      {geofenceShapes.map((geofence) => {
        if (geofence.shape === 'circle' && geofence.center && geofence.radius) {
          return (
            <CircleF
              key={`${geofence.id}`}
              center={toGoogleLatLng(geofence.center)}
              radius={geofence.radius}
              options={{ strokeColor: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.1, strokeWeight: 2 }}
            />
          )
        }

        if (geofence.shape === 'rectangle' && geofence.bounds) {
          const north = Math.max(geofence.bounds[0][0], geofence.bounds[1][0])
          const south = Math.min(geofence.bounds[0][0], geofence.bounds[1][0])
          const east = Math.max(geofence.bounds[0][1], geofence.bounds[1][1])
          const west = Math.min(geofence.bounds[0][1], geofence.bounds[1][1])

          return (
            <RectangleF
              key={`${geofence.id}`}
              bounds={{ north, south, east, west }}
              options={{ strokeColor: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.1, strokeWeight: 2 }}
            />
          )
        }

        if (geofence.shape === 'polygon' && geofence.points) {
          return (
            <PolygonF
              key={`${geofence.id}`}
              paths={geofence.points.map(toGoogleLatLng)}
              options={{ strokeColor: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.1, strokeWeight: 2 }}
            />
          )
        }

        if (geofence.shape === 'polyline' && geofence.points) {
          return (
            <PolylineF
              key={`${geofence.id}`}
              path={geofence.points.map(toGoogleLatLng)}
              options={{ strokeColor: '#22d3ee', strokeWeight: 4, strokeOpacity: 0.92 }}
            />
          )
        }

        if (geofence.shape === 'geojson' && geofence.geojson) {
          return extractGeoJsonPaths(geofence.geojson).map((ring, index) => (
            <PolygonF
              key={`${geofence.id}-${index}`}
              paths={ring.map(toGoogleLatLng)}
              options={{ strokeColor: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.1, strokeWeight: 2 }}
            />
          ))
        }

        return null
      })}

      {draftGeofence?.type === 'circle' && (
        <CircleF
          center={toGoogleLatLng(draftGeofence.center)}
          radius={draftGeofence.radius}
          options={{ strokeColor: '#f97316', fillColor: '#fb923c', fillOpacity: 0.16, strokeWeight: 3, zIndex: 90 }}
          editable
          draggable
          onLoad={(circle) => {
            draftCircleRef.current = circle
          }}
          onUnmount={() => {
            draftCircleRef.current = null
          }}
          onCenterChanged={syncDraftCircle}
          onRadiusChanged={syncDraftCircle}
          onDragEnd={syncDraftCircle}
          onMouseUp={syncDraftCircle}
        />
      )}

      {draftGeofence?.type === 'polygon' && (
        <PolygonF
          paths={draftGeofence.points.map(toGoogleLatLng)}
          options={{ strokeColor: '#f97316', fillColor: '#fb923c', fillOpacity: 0.16, strokeWeight: 3, zIndex: 90 }}
          editable
          draggable
          onLoad={(polygon) => {
            draftPolygonRef.current = polygon
          }}
          onUnmount={() => {
            draftPolygonRef.current = null
          }}
          onEdit={syncDraftPolygon}
          onDragEnd={() => syncDraftPolygon()}
          onMouseUp={() => syncDraftPolygon()}
        />
      )}

      {draftGeofence?.type === 'polyline' && (
        <PolylineF
          path={draftGeofence.points.map(toGoogleLatLng)}
          options={{ strokeColor: '#f97316', strokeWeight: 4, strokeOpacity: 0.95, zIndex: 90 }}
          editable
          draggable
          onLoad={(polyline) => {
            draftPolylineRef.current = polyline
            attachDraftPolylineListeners(polyline)
          }}
          onUnmount={() => {
            clearDraftPolylineListeners()
            draftPolylineRef.current = null
          }}
          onDragEnd={syncDraftPolyline}
          onMouseUp={syncDraftPolyline}
        />
      )}

      {routePathPoints.length > 1 && (
        <PolylineF
          path={routePathPoints.map(toGoogleLatLng)}
          options={{ strokeColor: '#3b82f6', strokeWeight: 4, strokeOpacity: 0.86 }}
        />
      )}

      {clustersEnabled
        ? (
          <MarkerClustererF
            averageCenter
            enableRetinaIcons
            gridSize={54}
            minimumClusterSize={2}
            styles={clusterStyles}
          >
            {(clusterer) => (
              <>
                {visibleVehicles.map((vehicle) => renderMarker(vehicle, clusterer))}
              </>
            )}
          </MarkerClustererF>
          )
        : visibleVehicles.map((vehicle) => renderMarker(vehicle))}
    </GoogleMap>
  )
}

export default TrackingMap
