import React from 'react'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import FmdGoodRoundedIcon from '@mui/icons-material/FmdGoodRounded'
import { strings } from '@/lang/tracking'
import * as bookcarsTypes from ':bookcars-types'
import type { FleetCounts, FleetVehicle } from './types'
import { getStatusColor } from './utils'

type FleetPanelProps = {
  vehicles: FleetVehicle[]
  counts: FleetCounts
  selectedCarId: string
  activeFilter: 'all' | bookcarsTypes.TraccarFleetStatus
  onFilterChange: (status: 'all' | bookcarsTypes.TraccarFleetStatus) => void
  onSelectCar: (carId: string) => void
  onExport: () => void
  onOpenGeofenceManager: () => void
}

const getStatusLabel = (status: bookcarsTypes.TraccarFleetStatus) => {
  switch (status) {
    case 'moving':
      return strings.STATUS_MOVING
    case 'idle':
      return strings.STATUS_IDLE
    case 'stopped':
      return strings.STATUS_STOPPED
    case 'stale':
      return strings.STATUS_STALE
    case 'noGps':
      return strings.STATUS_NO_GPS
    case 'offline':
      return strings.STATUS_OFFLINE
    case 'unlinked':
      return strings.STATUS_UNLINKED
    default:
      return strings.NO_DATA
  }
}

const getInitials = (value: string) => value
  .split(' ')
  .map((part) => part[0] || '')
  .join('')
  .slice(0, 2)
  .toUpperCase()

const FleetPanel = ({
  vehicles,
  counts,
  selectedCarId,
  activeFilter,
  onFilterChange,
  onSelectCar,
  onExport,
  onOpenGeofenceManager,
}: FleetPanelProps) => {
  const chips: Array<{ id: 'all' | bookcarsTypes.TraccarFleetStatus, label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'moving', label: strings.STATUS_MOVING },
    { id: 'idle', label: strings.STATUS_IDLE },
    { id: 'stopped', label: strings.STATUS_STOPPED },
    { id: 'stale', label: strings.STATUS_STALE },
    { id: 'noGps', label: strings.STATUS_NO_GPS },
    { id: 'offline', label: strings.STATUS_OFFLINE },
    { id: 'unlinked', label: strings.STATUS_UNLINKED },
  ]

  return (
    <div className="sb-view" id="fleet-view">
      <div className="sb-toolbar">
        <div className="sb-toolbar-top">
          <span className="sb-title">{strings.LIVE_FLEET}</span>
          <span className="sb-live-badge">
            <span className="sb-live-dot" />
            Live
          </span>
        </div>

        <div className="filter-chips" id="filter-chips">
          {chips.map((chip) => (
            <button
              type="button"
              key={chip.id}
              className={`chip${activeFilter === chip.id ? ' active' : ''}`}
              onClick={() => onFilterChange(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div id="fleet-list">
        {vehicles.length === 0
          ? (
            <div className="empty-state">
              <p>No vehicles match your current filter.</p>
            </div>
            )
          : vehicles.map((vehicle) => (
            <button
              type="button"
              key={vehicle.car._id}
              className={`car-card ${vehicle.status}${selectedCarId === vehicle.car._id ? ' selected' : ''}`}
              onClick={() => onSelectCar(vehicle.car._id)}
            >
              <div
                className={`car-avatar ${vehicle.status}`}
                style={{
                  background: `${getStatusColor(vehicle.status)}22`,
                  color: getStatusColor(vehicle.status),
                }}
              >
                {getInitials(vehicle.car.name)}
              </div>

              <div className="car-info">
                <div className="car-name">{vehicle.car.name}</div>
                <div className="car-plate">{vehicle.car.licensePlate || '---'}</div>
                <div className="car-meta">
                  <span className="car-speed">
                    {Math.round(vehicle.speedKmh)}
                    <span>km/h</span>
                  </span>
                  <span className="car-seen">{vehicle.lastSeenLabel}</span>
                </div>
              </div>

              <div className={`status-badge ${vehicle.status}`}>{getStatusLabel(vehicle.status)}</div>
            </button>
          ))}
      </div>

      <div className="fleet-summary-strip">
        <div className="fleet-summary-pill">
          <strong>{counts.total}</strong>
          <span>Total</span>
        </div>
        <div className="fleet-summary-pill">
          <strong>{counts.moving + counts.idle}</strong>
          <span>Active</span>
        </div>
        <div className="fleet-summary-pill">
          <strong>{counts.stale}</strong>
          <span>Stale</span>
        </div>
      </div>

      <div className="sb-footer">
        <button type="button" className="sb-footer-btn" onClick={onExport}>
          <DownloadRoundedIcon fontSize="small" />
          <span>Export CSV</span>
        </button>
        <button type="button" className="sb-footer-btn primary" onClick={onOpenGeofenceManager}>
          <FmdGoodRoundedIcon fontSize="small" />
          <span>{strings.GEOFENCE_MANAGER}</span>
        </button>
      </div>
    </div>
  )
}

export default FleetPanel
