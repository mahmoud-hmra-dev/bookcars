import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, Divider } from '@mui/material'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression, LatLngTuple } from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import { strings as commonStrings } from '@/lang/common'
import { strings as trackingStrings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import * as TrackingService from '@/services/TrackingService'
import { ensureLeafletIcons } from '@/utils/mapHelper'

import '@/assets/css/tracking.css'

const FitBounds: React.FC<{ positions: LatLngTuple[] }> = ({ positions }) => {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [30, 30] })
    }
  }, [positions, map])

  return null
}

const statusClass = (status: bookcarsTypes.TrackingStatus) => {
  if (status === 'ok') {
    return 'status-ok'
  }
  if (['no_fix_yet', 'device_not_found'].includes(status)) {
    return 'status-warn'
  }
  return 'status-error'
}

const getStatusLabel = (status: bookcarsTypes.TrackingStatus) => {
  switch (status) {
    case 'ok':
      return trackingStrings.OK
    case 'no_fix_yet':
      return trackingStrings.PENDING_FIX
    case 'device_not_found':
      return trackingStrings.DEVICE_NOT_FOUND
    case 'not_mapped':
      return trackingStrings.NOT_MAPPED
    case 'traccar_not_configured':
      return trackingStrings.TRACCAR_NOT_CONFIGURED
    case 'rate_limited':
      return trackingStrings.RATE_LIMITED
    default:
      return trackingStrings.TRACCAR_ERROR
  }
}

const FleetTracking = () => {
  const navigate = useNavigate()
  const [fleet, setFleet] = useState<bookcarsTypes.FleetTrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [pollSeconds, setPollSeconds] = useState(8)
  const mountedRef = useRef(true)

  const loadData = useCallback(async () => {
    try {
      const data = await TrackingService.getFleetTracking()
      if (!mountedRef.current) {
        return
      }

      setFleet(data)
      if (data?.pollAfterSeconds) {
        setPollSeconds(data.pollAfterSeconds)
      }
      setLastUpdate(new Date())
    } catch (err) {
      if (mountedRef.current) {
        helper.error(err)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    ensureLeafletIcons()
    mountedRef.current = true
    void loadData()
    const interval = window.setInterval(loadData, Math.max(pollSeconds, 5) * 1000)

    return () => {
      mountedRef.current = false
      window.clearInterval(interval)
    }
  }, [loadData, pollSeconds])

  const positions = useMemo(
    () => (fleet?.cars || [])
      .filter((c) => c.status === 'ok' && c.position)
      .map((c) => [c.position!.lat, c.position!.lon] as LatLngTuple),
    [fleet],
  )

  const status: bookcarsTypes.TrackingStatus = useMemo(() => {
    const cars = fleet?.cars || []
    const anyError = cars.some((c) => c.status !== 'ok' && c.status !== 'no_fix_yet')
    return anyError ? 'traccar_error' : 'ok'
  }, [fleet])
  const pollNote = trackingStrings.POLLING_NOTE.replace('{0}', String(pollSeconds))

  return (
    <Layout strict admin>
      <div className="tracking-page">
        <div className="tracking-grid">
          <div className="tracking-card">
            <h2>{trackingStrings.FLEET_TITLE}</h2>
            <div className="tracking-meta">
              <Chip label={getStatusLabel(status)} className={`status-pill ${statusClass(status)}`} />
              <span>{pollNote}</span>
              {lastUpdate && <span>{`${trackingStrings.LAST_UPDATE}: ${lastUpdate.toLocaleString()}`}</span>}
            </div>

            <Divider sx={{ my: 2 }} />

            {fleet?.cars && fleet.cars.length > 0 ? (
              <div className="fleet-list">
                {fleet.cars.map((car) => (
                  <div className="fleet-item" key={car.carId}>
                    <div>
                      <h4>{car.name}</h4>
                      {car.licensePlate && <div className="subtitle">{car.licensePlate}</div>}
                      <div className="meta">
                        {trackingStrings.STATUS}
                        :
                        {' '}
                        <span className={`status-pill ${statusClass(car.status)}`}>{getStatusLabel(car.status)}</span>
                      </div>
                    </div>
                    <div className="tracking-actions">
                      <Button variant="outlined" size="small" onClick={() => navigate(`/car-tracking?cr=${car.carId}`)}>
                        {trackingStrings.CAR_TITLE}
                      </Button>
                      {car.traccarDeviceId && (
                        <Chip
                          label={`ID: ${car.traccarDeviceId}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>{trackingStrings.NO_TRACKING_DATA}</div>
            )}
          </div>

          <div className="tracking-map">
            <MapContainer
              center={(positions[0] as LatLngExpression) || [0, 0]}
              zoom={positions.length > 0 ? 11 : 2}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {positions.length > 0 && <FitBounds positions={positions} />}
              {fleet?.cars
                ?.filter((c) => c.status === 'ok' && c.position)
                .map((car) => (
                  <Marker key={car.carId} position={[car.position!.lat, car.position!.lon]}>
                    <Popup>
                      <strong>{car.name}</strong>
                      <br />
                      {car.licensePlate}
                      {car.position?.fixTime && (
                        <>
                          <br />
                          {new Date(car.position.fixTime).toLocaleString()}
                        </>
                      )}
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </div>
      </div>
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default FleetTracking
