import React, { useMemo, useState } from 'react'
import {
  Button,
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

import '@/assets/css/tracking.css'

const formatDateInput = (date: Date) => date.toISOString().slice(0, 16)

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

  const currentPosition = positions.length > 0 ? positions[0] : null

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="tracking-page">
          <Typography variant="h4" className="tracking-title">{strings.TITLE}</Typography>

          {!integrationEnabled && (
            <Paper className="tracking-card">
              <Typography color="error">{strings.INTEGRATION_DISABLED}</Typography>
            </Paper>
          )}

          <Paper className="tracking-card">
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
          )}

          {selectedCar && (
            <Paper className="tracking-card">
              <div className="tracking-header">
                <Typography variant="h6">{strings.CURRENT_POSITION}</Typography>
                <Button variant="contained" className="btn-primary" onClick={handleFetchPositions} disabled={!integrationEnabled}>{strings.FETCH}</Button>
              </div>
              {currentPosition ? (
                <div className="tracking-data">
                  <div>{`Lat: ${currentPosition.latitude}, Lng: ${currentPosition.longitude}`}</div>
                  <div>{`Speed: ${currentPosition.speed ?? 0}`}</div>
                  <div>{`Time: ${currentPosition.deviceTime || currentPosition.serverTime || ''}`}</div>
                  {currentPosition.address && <div>{`Address: ${currentPosition.address}`}</div>}
                </div>
              ) : (
                <div className="tracking-empty">{strings.NO_DATA}</div>
              )}
            </Paper>
          )}

          {selectedCar && (
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
                  {route.slice(0, 10).map((position) => (
                    <div key={position.id} className="tracking-list-item">
                      {`${position.deviceTime || position.serverTime || ''} - ${position.latitude}, ${position.longitude}`}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tracking-empty">{strings.NO_DATA}</div>
              )}
            </Paper>
          )}

          {selectedCar && (
            <Paper className="tracking-card">
              <div className="tracking-header">
                <Typography variant="h6">{strings.GEOFENCES}</Typography>
                <Button variant="contained" className="btn-primary" onClick={handleFetchGeofences} disabled={!integrationEnabled}>{strings.FETCH}</Button>
              </div>
              {geofences.length > 0 ? (
                <div className="tracking-list">
                  {geofences.map((geofence) => (
                    <div key={geofence.id} className="tracking-list-item">{geofence.name}</div>
                  ))}
                </div>
              ) : (
                <div className="tracking-empty">{strings.NO_DATA}</div>
              )}
            </Paper>
          )}

          {selectedCar && (
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
                  {alerts.map((alert) => (
                    <div key={alert.id} className="tracking-list-item">
                      {`${alert.eventTime || ''} - ${geofenceLookup.get(alert.geofenceId || -1) || alert.geofenceId || alert.type}`}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tracking-empty">{strings.NO_DATA}</div>
              )}
            </Paper>
          )}
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Tracking
