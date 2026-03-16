import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import RoomIcon from '@mui/icons-material/Room'
import RouteIcon from '@mui/icons-material/Route'
import RadarIcon from '@mui/icons-material/Radar'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SpeedIcon from '@mui/icons-material/Speed'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polygon, Polyline, Popup, Rectangle, TileLayer, useMap } from 'react-leaflet'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as TraccarService from '@/services/TraccarService'

import 'leaflet/dist/leaflet.css'
import '@/assets/css/tracking.css'

const formatDateInput = (date: Date) => date.toISOString().slice(0, 16)
const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018]

const currentMarkerIcon = L.divIcon({
  className: 'tracking-marker tracking-marker--current',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const startMarkerIcon = L.divIcon({
  className: 'tracking-marker tracking-marker--start',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const endMarkerIcon = L.divIcon({
  className: 'tracking-marker tracking-marker--end',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

type LatLngTuple = [number, number]

type ParsedGeofence = {
  id: number | string
  name: string
  shape: 'circle' | 'polygon' | 'rectangle'
  center?: LatLngTuple
  radius?: number
  points?: LatLngTuple[]
  bounds?: [LatLngTuple, LatLngTuple]
}

const isFiniteCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const toLatLng = (position?: bookcarsTypes.TraccarPosition | null): LatLngTuple | null => {
  if (!position || !isFiniteCoordinate(position.latitude) || !isFiniteCoordinate(position.longitude)) {
    return null
  }

  return [position.latitude, position.longitude]
}

const parseGeofenceArea = (geofence: bookcarsTypes.TraccarGeofence, fallbackIndex: number): ParsedGeofence | null => {
  if (!geofence.area) {
    return null
  }

  const [rawType, rawCoords] = geofence.area.split('(', 2)
  if (!rawType || !rawCoords) {
    return null
  }

  const shapeType = rawType.trim().toUpperCase()
  const coords = rawCoords.replace(/\)\s*$/, '').split(',').map((item) => Number.parseFloat(item.trim()))
  const name = geofence.name || geofence.description || `Geofence ${fallbackIndex + 1}`
  const id = geofence.id ?? `${shapeType}-${fallbackIndex}`

  if (shapeType === 'CIRCLE' && coords.length >= 3) {
    const [lat, lng, radius] = coords
    if ([lat, lng, radius].every((item) => Number.isFinite(item))) {
      return {
        id,
        name,
        shape: 'circle',
        center: [lat, lng],
        radius,
      }
    }
  }

  if (shapeType === 'RECTANGLE' && coords.length >= 4) {
    const [lat1, lng1, lat2, lng2] = coords
    if ([lat1, lng1, lat2, lng2].every((item) => Number.isFinite(item))) {
      return {
        id,
        name,
        shape: 'rectangle',
        bounds: [[lat1, lng1], [lat2, lng2]],
      }
    }
  }

  if (shapeType === 'POLYGON' && coords.length >= 6 && coords.length % 2 === 0) {
    const points: LatLngTuple[] = []
    for (let i = 0; i < coords.length; i += 2) {
      const lat = coords[i]
      const lng = coords[i + 1]
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null
      }
      points.push([lat, lng])
    }

    return {
      id,
      name,
      shape: 'polygon',
      points,
    }
  }

  return null
}

const formatTimestamp = (value?: Date | string) => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? `${value}` : date.toLocaleString()
}

const formatCoordinate = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '—')
const formatNumber = (value?: number, suffix = '') => (typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100) / 100}${suffix}` : '—')

const TrackingMapViewport = ({
  currentPoint,
  routePoints,
  geofenceShapes,
}: {
  currentPoint: LatLngTuple | null
  routePoints: LatLngTuple[]
  geofenceShapes: ParsedGeofence[]
}) => {
  const map = useMap()

  React.useEffect(() => {
    const bounds = L.latLngBounds([])

    if (currentPoint) {
      bounds.extend(currentPoint)
    }

    routePoints.forEach((point) => bounds.extend(point))

    geofenceShapes.forEach((shape) => {
      if (shape.center) {
        bounds.extend(shape.center)
      }
      shape.points?.forEach((point) => bounds.extend(point))
      if (shape.bounds) {
        bounds.extend(shape.bounds[0])
        bounds.extend(shape.bounds[1])
      }
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    } else {
      map.setView(DEFAULT_CENTER, 7)
    }
  }, [map, currentPoint, routePoints, geofenceShapes])

  return null
}

const Tracking = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [selectedCar, setSelectedCar] = useState<bookcarsTypes.Car | null>(null)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [notes, setNotes] = useState('')
  const [positions, setPositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [route, setRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [alerts, setAlerts] = useState<bookcarsTypes.TraccarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(true)

  const now = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(formatDateInput(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
  const [to, setTo] = useState(formatDateInput(now))

  const geofenceLookup = useMemo(() => {
    const lookup = new Map<number, string>()
    geofences.forEach((geofence) => {
      if (typeof geofence.id === 'number' && geofence.name) {
        lookup.set(geofence.id, geofence.name)
      }
    })
    return lookup
  }, [geofences])

  const currentPosition = positions.length > 0 ? positions[0] : null
  const currentPoint = useMemo(() => toLatLng(currentPosition), [currentPosition])
  const routePoints = useMemo(() => route.map((position) => toLatLng(position)).filter((point): point is LatLngTuple => point !== null), [route])
  const geofenceShapes = useMemo(() => geofences.map(parseGeofenceArea).filter((shape): shape is ParsedGeofence => shape !== null), [geofences])
  const routeStart = route.length > 0 ? route[0] : null
  const routeEnd = route.length > 1 ? route[route.length - 1] : route[0] || null
  const routeStartPoint = useMemo(() => toLatLng(routeStart), [routeStart])
  const routeEndPoint = useMemo(() => toLatLng(routeEnd), [routeEnd])
  const latestAlert = alerts[0]

  const resetTrackingData = () => {
    setPositions([])
    setRoute([])
    setGeofences([])
    setAlerts([])
  }

  const handleCarChange = (carId: string) => {
    setSelectedCarId(carId)
    const car = cars.find((item) => item._id === carId) || null
    setSelectedCar(car)
    setTrackingEnabled(car?.tracking?.enabled ?? false)
    setDeviceId(car?.tracking?.deviceId ? car.tracking.deviceId.toString() : '')
    setDeviceName(car?.tracking?.deviceName || '')
    setNotes(car?.tracking?.notes || '')
    resetTrackingData()
  }

  const handleLoadCars = async () => {
    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: [],
      carType: bookcarsHelper.getAllCarTypes(),
      gearbox: [bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      fuelPolicy: bookcarsHelper.getAllFuelPolicies(),
      deposit: -1,
      availability: [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable],
      ranges: bookcarsHelper.getAllRanges(),
      multimedia: [],
      rating: -1,
      seats: -1,
    }

    const suppliers = await SupplierService.getAllSuppliers()
    payload.suppliers = bookcarsHelper.flattenSuppliers(suppliers)

    const data = await CarService.getCars('', payload, 1, env.CARS_PAGE_SIZE)
    const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
    const result = _data?.resultData || []
    setCars(result)

    if (result.length > 0 && !selectedCarId) {
      handleCarChange(result[0]._id)
    }
  }

  const handleLink = async () => {
    if (!selectedCar) {
      return
    }

    if (!deviceId) {
      helper.error(null, commonStrings.FIELD_NOT_VALID)
      return
    }

    setLoading(true)
    try {
      const tracking = await TraccarService.linkDevice(selectedCar._id, {
        deviceId: Number.parseInt(deviceId, 10),
        deviceName,
        notes,
        enabled: trackingEnabled,
      })
      const updated = { ...selectedCar, tracking }
      setSelectedCar(updated)
      setCars((prev) => prev.map((car) => (car._id === updated._id ? updated : car)))
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlink = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const tracking = await TraccarService.unlinkDevice(selectedCar._id)
      const updated = { ...selectedCar, tracking }
      setSelectedCar(updated)
      setCars((prev) => prev.map((car) => (car._id === updated._id ? updated : car)))
      setDeviceId('')
      setDeviceName('')
      setNotes('')
      setTrackingEnabled(false)
      resetTrackingData()
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchPositions = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getPositions(selectedCar._id)
      setPositions(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchRoute = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString())
      setRoute(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchGeofences = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getGeofences(selectedCar._id)
      setGeofences(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchAlerts = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getGeofenceAlerts(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString())
      setAlerts(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (!_user || !_user.verified) {
      return
    }

    setUser(_user)
    setLoading(true)

    try {
      const status = await TraccarService.getStatus()
      setIntegrationEnabled(status.enabled)
      await handleLoadCars()
    } catch (err) {
      helper.error(err)
      setIntegrationEnabled(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="tracking-page">
          <div className="tracking-page-header">
            <div>
              <Typography variant="h4" className="tracking-title">{strings.TITLE}</Typography>
              <Typography className="tracking-subtitle">{strings.TRACKING_SUBTITLE}</Typography>
            </div>
            {selectedCar && <Chip color={trackingEnabled ? 'success' : 'default'} label={trackingEnabled ? strings.TRACKING_ENABLED : strings.TRACKING_DISABLED} />}
          </div>

          {!integrationEnabled && (
            <Paper className="tracking-card">
              <Typography color="error">{strings.INTEGRATION_DISABLED}</Typography>
            </Paper>
          )}

          <Paper className="tracking-card tracking-controls-card">
            <FormControl fullWidth>
              <InputLabel>{strings.SELECT_CAR}</InputLabel>
              <Select
                value={selectedCarId}
                label={strings.SELECT_CAR}
                onChange={(event) => handleCarChange(event.target.value as string)}
              >
                {cars.map((car) => (
                  <MenuItem key={car._id} value={car._id}>{car.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          {selectedCar && (
            <div className="tracking-layout">
              <div className="tracking-main-column">
                <Paper className="tracking-card tracking-map-card">
                  <div className="tracking-header">
                    <div>
                      <Typography variant="h6">{strings.MAP_OVERVIEW}</Typography>
                      <Typography className="tracking-card-subtitle">{strings.MAP_HINT}</Typography>
                    </div>
                    <div className="tracking-map-legend">
                      <span><i className="tracking-legend-dot tracking-legend-dot--current" /> {strings.CURRENT_POSITION}</span>
                      <span><i className="tracking-legend-line" /> {strings.ROUTE_HISTORY}</span>
                      <span><i className="tracking-legend-zone" /> {strings.GEOFENCES}</span>
                    </div>
                  </div>

                  <div className="tracking-map-shell">
                    <MapContainer center={DEFAULT_CENTER} zoom={7} scrollWheelZoom className="tracking-map">
                      <TileLayer
                        attribution={'&copy; OpenStreetMap contributors'}
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <TrackingMapViewport currentPoint={currentPoint} routePoints={routePoints} geofenceShapes={geofenceShapes} />

                      {geofenceShapes.map((geofence) => {
                        if (geofence.shape === 'circle' && geofence.center && geofence.radius) {
                          return (
                            <Circle
                              key={`${geofence.id}`}
                              center={geofence.center}
                              radius={geofence.radius}
                              pathOptions={{ color: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, weight: 2 }}
                            >
                              <Popup>{geofence.name}</Popup>
                            </Circle>
                          )
                        }

                        if (geofence.shape === 'rectangle' && geofence.bounds) {
                          return (
                            <Rectangle
                              key={`${geofence.id}`}
                              bounds={geofence.bounds}
                              pathOptions={{ color: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, weight: 2 }}
                            >
                              <Popup>{geofence.name}</Popup>
                            </Rectangle>
                          )
                        }

                        if (geofence.shape === 'polygon' && geofence.points) {
                          return (
                            <Polygon
                              key={`${geofence.id}`}
                              positions={geofence.points}
                              pathOptions={{ color: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, weight: 2 }}
                            >
                              <Popup>{geofence.name}</Popup>
                            </Polygon>
                          )
                        }

                        return null
                      })}

                      {routePoints.length > 1 && (
                        <Polyline positions={routePoints} pathOptions={{ color: '#1976d2', weight: 4, opacity: 0.9 }} />
                      )}

                      {routeStartPoint && routePoints.length > 1 && (
                        <Marker position={routeStartPoint} icon={startMarkerIcon}>
                          <Popup>{strings.ROUTE_START}</Popup>
                        </Marker>
                      )}

                      {routeEndPoint && routePoints.length > 1 && (
                        <Marker position={routeEndPoint} icon={endMarkerIcon}>
                          <Popup>{strings.ROUTE_END}</Popup>
                        </Marker>
                      )}

                      {currentPoint && (
                        <Marker position={currentPoint} icon={currentMarkerIcon}>
                          <Popup>
                            <strong>{selectedCar.name}</strong>
                            <br />
                            {`${formatCoordinate(currentPosition?.latitude)}, ${formatCoordinate(currentPosition?.longitude)}`}
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>

                    {!currentPoint && routePoints.length === 0 && geofenceShapes.length === 0 && (
                      <div className="tracking-map-empty">
                        <Typography variant="body1">{strings.NO_MAP_DATA}</Typography>
                        <Typography variant="body2">{strings.MAP_EMPTY_HELP}</Typography>
                      </div>
                    )}
                  </div>
                </Paper>

                <div className="tracking-summary-grid">
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--position"><RoomIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.CURRENT_POSITION}</Typography>
                      <Typography variant="h6">{currentPoint ? `${formatCoordinate(currentPosition?.latitude)}, ${formatCoordinate(currentPosition?.longitude)}` : '—'}</Typography>
                      <Typography className="tracking-stat-note">{currentPosition?.address || strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--route"><RouteIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.ROUTE_POINTS}</Typography>
                      <Typography variant="h6">{routePoints.length}</Typography>
                      <Typography className="tracking-stat-note">{routeStart ? formatTimestamp(routeStart.deviceTime || routeStart.serverTime || routeStart.fixTime) : strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--geofence"><RadarIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.GEOFENCES}</Typography>
                      <Typography variant="h6">{geofences.length}</Typography>
                      <Typography className="tracking-stat-note">{geofenceShapes.length > 0 ? `${geofenceShapes.length} ${strings.MAP_READY}` : strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--alerts"><WarningAmberIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.GEOFENCE_ALERTS}</Typography>
                      <Typography variant="h6">{alerts.length}</Typography>
                      <Typography className="tracking-stat-note">{latestAlert ? formatTimestamp(latestAlert.eventTime) : strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                </div>
              </div>

              <div className="tracking-side-column">
                <Paper className="tracking-card">
                  <Typography variant="h6" className="tracking-section-title">{strings.LINK_DEVICE}</Typography>
                  <div className="tracking-grid">
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={trackingEnabled}
                          onChange={(event) => setTrackingEnabled(event.target.checked)}
                        />
                      )}
                      label={strings.TRACKING_ENABLED}
                    />
                    <TextField
                      label={strings.DEVICE_ID}
                      value={deviceId}
                      onChange={(event) => setDeviceId(event.target.value)}
                    />
                    <TextField
                      label={strings.DEVICE_NAME}
                      value={deviceName}
                      onChange={(event) => setDeviceName(event.target.value)}
                    />
                    <TextField
                      label={strings.NOTES}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <div className="tracking-actions">
                    <Button variant="contained" className="btn-primary" onClick={handleLink} disabled={!integrationEnabled}>{strings.LINK_DEVICE}</Button>
                    <Button variant="contained" className="btn-secondary" onClick={handleUnlink}>{strings.UNLINK_DEVICE}</Button>
                  </div>
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.CURRENT_POSITION}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchPositions} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  {currentPosition ? (
                    <div className="tracking-data tracking-detail-list">
                      <div><RoomIcon fontSize="small" /> {`${formatCoordinate(currentPosition.latitude)}, ${formatCoordinate(currentPosition.longitude)}`}</div>
                      <div><SpeedIcon fontSize="small" /> {`${strings.SPEED}: ${formatNumber(currentPosition.speed, ' kn')}`}</div>
                      <div><AccessTimeIcon fontSize="small" /> {`${strings.TIME}: ${formatTimestamp(currentPosition.deviceTime || currentPosition.serverTime || currentPosition.fixTime)}`}</div>
                      {currentPosition.address && <div>{`${strings.ADDRESS}: ${currentPosition.address}`}</div>}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.ROUTE_HISTORY}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchRoute} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  <div className="tracking-grid">
                    <TextField
                      label={strings.FROM}
                      type="datetime-local"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                    />
                    <TextField
                      label={strings.TO}
                      type="datetime-local"
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </div>
                  {route.length > 0 ? (
                    <div className="tracking-list">
                      {route.slice(0, 10).map((position, index) => (
                        <div key={position.id || `${position.latitude}-${position.longitude}-${index}`} className="tracking-list-item">
                          <div>{formatTimestamp(position.deviceTime || position.serverTime || position.fixTime)}</div>
                          <div>{`${formatCoordinate(position.latitude)}, ${formatCoordinate(position.longitude)}`}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.GEOFENCES}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchGeofences} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  {geofences.length > 0 ? (
                    <div className="tracking-list">
                      {geofences.map((geofence, index) => {
                        const parsed = parseGeofenceArea(geofence, index)
                        return (
                          <div key={geofence.id || `${geofence.name}-${index}`} className="tracking-list-item">
                            <div>{geofence.name || geofence.description || `Geofence ${index + 1}`}</div>
                            <div className="tracking-list-subtext">{parsed ? `${strings.SHAPE}: ${parsed.shape}` : strings.UNSUPPORTED_GEOFENCE}</div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.GEOFENCE_ALERTS}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchAlerts} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  <div className="tracking-grid">
                    <TextField
                      label={strings.FROM}
                      type="datetime-local"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                    />
                    <TextField
                      label={strings.TO}
                      type="datetime-local"
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </div>
                  {alerts.length > 0 ? (
                    <div className="tracking-list">
                      {alerts.map((alert, index) => (
                        <div key={alert.id || `${alert.geofenceId}-${index}`} className="tracking-list-item">
                          <div>{formatTimestamp(alert.eventTime || '')}</div>
                          <div className="tracking-list-subtext">{geofenceLookup.get(alert.geofenceId || -1) || alert.geofenceId || alert.type}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                {geofences.length > 0 && geofenceShapes.length !== geofences.length && (
                  <Alert severity="info" className="tracking-info-alert">
                    {strings.GEOFENCE_PARSE_NOTICE}
                  </Alert>
                )}

                <Divider />
              </div>
            </div>
          )}
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Tracking
