import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Chip, Divider } from '@mui/material'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import { strings as commonStrings } from '@/lang/common'
import { strings as trackingStrings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import * as TrackingService from '@/services/TrackingService'
import { ensureLeafletIcons } from '@/utils/mapHelper'

import '@/assets/css/tracking.css'

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
    case 'car_not_found':
      return trackingStrings.NO_TRACKING_DATA
    default:
      return trackingStrings.TRACCAR_ERROR
  }
}

const knotsToKmh = (speed?: number) => {
  if (typeof speed !== 'number') {
    return null
  }
  return Math.round(speed * 1.852)
}

const Recenter: React.FC<{ position?: LatLngExpression }> = ({ position }) => {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, 15)
    }
  }, [position, map])

  return null
}

const CarTracking = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const carId = searchParams.get('cr') || searchParams.get('carId')

  const [tracking, setTracking] = useState<bookcarsTypes.CarTrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [pollSeconds, setPollSeconds] = useState(8)
  const mountedRef = useRef(true)

  const loadData = useCallback(async () => {
    if (!carId) {
      setLoading(false)
      return
    }

    try {
      const data = await TrackingService.getCarTracking(carId)
      if (!mountedRef.current) {
        return
      }

      setTracking(data)
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
  }, [carId])

  useEffect(() => {
    ensureLeafletIcons()
    mountedRef.current = true
    void loadData()
    const interval = carId ? window.setInterval(loadData, Math.max(pollSeconds, 5) * 1000) : null

    return () => {
      mountedRef.current = false
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [loadData, pollSeconds, carId])

  const status = tracking?.status || 'ok'
  const position = useMemo(() => tracking?.position, [tracking])
  const center: LatLngExpression = position ? [position.lat, position.lon] : [0, 0]
  const speedKmh = knotsToKmh(position?.speed)
  const pollNote = trackingStrings.POLLING_NOTE.replace('{0}', String(pollSeconds))

  return (
    <Layout strict admin>
      {!carId && (
        <div className="tracking-page">
          <div className="tracking-card">
            {trackingStrings.NO_TRACKING_DATA}
          </div>
        </div>
      )}
      {carId && (
        <div className="tracking-page">
          <div className="tracking-grid">
            <div className="tracking-card">
              <h2>{trackingStrings.CAR_TITLE}</h2>
              {tracking?.car && (
                <>
                  <h3>{tracking.car.name}</h3>
                  {tracking.car.licensePlate && <div className="subtitle">{tracking.car.licensePlate}</div>}
                </>
              )}
              <div className="tracking-meta">
                <Chip label={getStatusLabel(status)} className={`status-pill ${statusClass(status)}`} />
                <span>{pollNote}</span>
                {lastUpdate && <span>{`${trackingStrings.LAST_UPDATE}: ${lastUpdate.toLocaleString()}`}</span>}
                {tracking?.car?.traccarDeviceId && <span>{`Device ID: ${tracking.car.traccarDeviceId}`}</span>}
                {tracking?.car?.traccarUniqueId && <span>{`Unique ID: ${tracking.car.traccarUniqueId}`}</span>}
              </div>

              <Divider sx={{ my: 2 }} />

              {status !== 'ok' && status !== 'no_fix_yet' && (
                <div>{getStatusLabel(status)}</div>
              )}

              {status === 'no_fix_yet' && <div>{trackingStrings.NO_POSITION}</div>}

              {position && (
                <div className="tracking-meta">
                  <span>
                    {trackingStrings.SPEED}
                    :
                    {' '}
                    {speedKmh !== null ? `${speedKmh} km/h` : '-'}
                  </span>
                  {typeof position.course === 'number' && (
                    <span>
                      {trackingStrings.COURSE}
                      :
                      {' '}
                      {Math.round(position.course)}
                      °
                    </span>
                  )}
                  {position.fixTime && (
                    <span>
                      {trackingStrings.LAST_UPDATE}
                      :
                      {' '}
                      {new Date(position.fixTime).toLocaleString()}
                    </span>
                  )}
                  {position.address && (
                    <span>
                      {trackingStrings.ADDRESS}
                      :
                      {' '}
                      {position.address}
                    </span>
                  )}
                </div>
              )}

              <Divider sx={{ my: 2 }} />

              <div className="tracking-actions">
                <Button variant="outlined" size="small" onClick={() => navigate('/fleet-tracking')}>
                  {trackingStrings.FLEET_TITLE}
                </Button>
                <Button variant="outlined" size="small" onClick={() => navigate('/cars')}>
                  {commonStrings.CARS}
                </Button>
              </div>
            </div>

            <div className="tracking-map">
              <MapContainer
                center={center}
                zoom={position ? 15 : 2}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Recenter position={position ? [position.lat, position.lon] : undefined} />
                {position && (
                  <Marker position={[position.lat, position.lon]}>
                    <Popup>
                      {tracking?.car?.name}
                      <br />
                      {tracking?.car?.licensePlate}
                      {position.fixTime && (
                        <>
                          <br />
                          {new Date(position.fixTime).toLocaleString()}
                        </>
                      )}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default CarTracking
