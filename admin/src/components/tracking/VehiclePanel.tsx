import React from 'react'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import FmdGoodRoundedIcon from '@mui/icons-material/FmdGoodRounded'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/tracking'
import type {
  DraftGeofenceShape,
  FleetVehicle,
  GeofenceEditorType,
  RouteFrame,
  TrackingTab,
} from './types'
import {
  EVENT_TYPE_OPTIONS,
  PLAYBACK_SPEED_OPTIONS,
  formatCoordinate,
  formatDistanceKm,
  formatDuration,
  formatTimestamp,
  getStatusColor,
  hasDraftGeofenceGeometry,
} from './utils'

type VehiclePanelProps = {
  selectedVehicle: FleetVehicle
  activeTab: TrackingTab
  from: string
  to: string
  routeFrames: RouteFrame[]
  routeDistanceMeters?: number | null
  routeDurationMs?: number | null
  routeAverageSpeed?: number | null
  routeMaxSpeed?: number | null
  routeSnapMode: 'idle' | 'loading' | 'snapped' | 'raw'
  playbackActive: boolean
  playbackIndex: number
  playbackProgress: number
  playbackSpeed: number
  playbackSpeedKmh: number
  linkedGeofences: bookcarsTypes.TraccarGeofence[]
  allGeofences: bookcarsTypes.TraccarGeofence[]
  linkedGeofenceIds: Set<number>
  events: bookcarsTypes.TraccarEventCenterEntry[]
  eventTypeFilter: (typeof EVENT_TYPE_OPTIONS)[number]
  devices: bookcarsTypes.TraccarDevice[]
  deviceId: string
  deviceName: string
  notes: string
  commandTypes: bookcarsTypes.TraccarCommandType[]
  selectedCommandType: string
  commandTextChannel: boolean
  commandAttributes: string
  zonesLoading: boolean
  routeLoading: boolean
  eventsLoading: boolean
  snapshotLoading: boolean
  deviceSaving: boolean
  commandSending: boolean
  zoneStudioOpen: boolean
  editingGeofenceId: number | null
  zoneFormName: string
  zoneFormDescription: string
  zoneFormType: GeofenceEditorType
  zoneFormRadius: string
  zoneFormPolylineDistance: string
  zoneDraft: DraftGeofenceShape | null
  onBack: () => void
  onTabChange: (tab: TrackingTab) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onFocusVehicle: () => void
  onLoadSnapshot: () => void
  onLoadRoute: () => void
  onPlaybackToggle: () => void
  onPlaybackRestart: () => void
  onPlaybackScrub: (value: number) => void
  onPlaybackSpeedChange: (value: number) => void
  onRefreshZones: () => void
  onOpenCreateZone: () => void
  onOpenEditZone: (geofence: bookcarsTypes.TraccarGeofence) => void
  onDeleteZone: (geofenceId: number) => void
  onToggleGeofenceLink: (geofenceId: number, linked: boolean) => void
  onCloseZoneStudio: () => void
  onZoneNameChange: (value: string) => void
  onZoneDescriptionChange: (value: string) => void
  onZoneTypeChange: (value: GeofenceEditorType) => void
  onZoneRadiusChange: (value: string) => void
  onZonePolylineDistanceChange: (value: string) => void
  onStartZoneDrawing: () => void
  onClearZoneShape: () => void
  onSaveZone: () => void
  onLoadEvents: () => void
  onEventTypeChange: (value: (typeof EVENT_TYPE_OPTIONS)[number]) => void
  onDeviceIdChange: (value: string) => void
  onDeviceNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onLinkDevice: () => void
  onUnlinkDevice: () => void
  onCommandTypeChange: (value: string) => void
  onCommandTextChannelChange: (value: boolean) => void
  onCommandAttributesChange: (value: string) => void
  onSendCommand: () => void
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

const getEventTypeLabel = (type?: string) => {
  switch (type) {
    case 'geofenceEnter':
      return strings.EVENT_GEOFENCE_ENTER
    case 'geofenceExit':
      return strings.EVENT_GEOFENCE_EXIT
    case 'deviceOnline':
      return strings.EVENT_DEVICE_ONLINE
    case 'deviceOffline':
      return strings.EVENT_DEVICE_OFFLINE
    case 'ignitionOn':
      return strings.EVENT_IGNITION_ON
    case 'ignitionOff':
      return strings.EVENT_IGNITION_OFF
    case 'overspeed':
      return strings.EVENT_OVERSPEED
    case 'alarm':
      return strings.EVENT_ALARM
    case 'motion':
      return strings.EVENT_MOTION
    case 'deviceMoving':
      return strings.EVENT_DEVICE_MOVING
    case 'deviceStopped':
      return strings.EVENT_DEVICE_STOPPED
    case 'all':
      return strings.ALL_EVENTS
    default:
      return type || strings.NO_DATA
  }
}

const getInitials = (value: string) => value
  .split(' ')
  .map((part) => part[0] || '')
  .join('')
  .slice(0, 2)
  .toUpperCase()

const VehiclePanel = ({
  selectedVehicle,
  activeTab,
  from,
  to,
  routeFrames,
  routeDistanceMeters,
  routeDurationMs,
  routeAverageSpeed,
  routeMaxSpeed,
  routeSnapMode,
  playbackActive,
  playbackIndex,
  playbackProgress,
  playbackSpeed,
  playbackSpeedKmh,
  linkedGeofences,
  allGeofences,
  linkedGeofenceIds,
  events,
  eventTypeFilter,
  devices,
  deviceId,
  deviceName,
  notes,
  commandTypes,
  selectedCommandType,
  commandTextChannel,
  commandAttributes,
  zonesLoading,
  routeLoading,
  eventsLoading,
  snapshotLoading,
  deviceSaving,
  commandSending,
  zoneStudioOpen,
  editingGeofenceId,
  zoneFormName,
  zoneFormDescription,
  zoneFormType,
  zoneFormRadius,
  zoneFormPolylineDistance,
  zoneDraft,
  onBack,
  onTabChange,
  onFromChange,
  onToChange,
  onFocusVehicle,
  onLoadSnapshot,
  onLoadRoute,
  onPlaybackToggle,
  onPlaybackRestart,
  onPlaybackScrub,
  onPlaybackSpeedChange,
  onRefreshZones,
  onOpenCreateZone,
  onOpenEditZone,
  onDeleteZone,
  onToggleGeofenceLink,
  onCloseZoneStudio,
  onZoneNameChange,
  onZoneDescriptionChange,
  onZoneTypeChange,
  onZoneRadiusChange,
  onZonePolylineDistanceChange,
  onStartZoneDrawing,
  onClearZoneShape,
  onSaveZone,
  onLoadEvents,
  onEventTypeChange,
  onDeviceIdChange,
  onDeviceNameChange,
  onNotesChange,
  onLinkDevice,
  onUnlinkDevice,
  onCommandTypeChange,
  onCommandTextChannelChange,
  onCommandAttributesChange,
  onSendCommand,
}: VehiclePanelProps) => {
  const routeHasData = routeFrames.length > 0
  const routePositionLabel = routeHasData ? `${playbackIndex + 1}/${routeFrames.length}` : '0/0'
  const canManageTracking = selectedVehicle.isLinked
  const draftReady = hasDraftGeofenceGeometry(zoneDraft)
  const coordinates = selectedVehicle.position
    ? `${formatCoordinate(selectedVehicle.position.latitude)}, ${formatCoordinate(selectedVehicle.position.longitude)}`
    : '-'

  const renderStatusTab = () => (
    <>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">{strings.SPEED}</div>
          <div className="metric-val">
            {Math.round(selectedVehicle.speedKmh)}
            <span>km/h</span>
          </div>
          <div className="metric-sub">{selectedVehicle.status === 'moving' ? 'In transit' : 'Stationary'}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">{strings.BATTERY}</div>
          <div className="metric-val">
            {typeof selectedVehicle.batteryLevel === 'number' ? Math.round(selectedVehicle.batteryLevel) : '-'}
            <span>%</span>
          </div>
          <div className="metric-sub">{typeof selectedVehicle.batteryLevel === 'number' ? 'Tracker telemetry' : strings.NO_DATA}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">{strings.IGNITION}</div>
          <div className="metric-val metric-val--label">{selectedVehicle.ignition ? strings.ON : strings.OFF}</div>
          <div className="metric-sub">{selectedVehicle.ignition ? 'Engine active' : 'Engine off'}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">{strings.LAST_SEEN}</div>
          <div className="metric-val metric-val--label">{selectedVehicle.lastSeenLabel}</div>
          <div className="metric-sub">{formatTimestamp(selectedVehicle.snapshot?.lastPositionAt || selectedVehicle.snapshot?.lastSyncedAt)}</div>
        </div>
      </div>

      {selectedVehicle.address && (
        <div className="info-chip info-chip--address">
          <FmdGoodRoundedIcon fontSize="small" />
          <span>{selectedVehicle.address}</span>
        </div>
      )}

      <div className="section-card">
        <div className="section-card-head">
          <span className="section-card-title">Telemetry</span>
        </div>
        <div className="section-card-body">
          <div className="detail-row"><span className="detail-key">{strings.SELECTED_VEHICLE}</span><span className="detail-val">{selectedVehicle.car.name}</span></div>
          <div className="detail-row"><span className="detail-key">Plate</span><span className="detail-val">{selectedVehicle.car.licensePlate || '---'}</span></div>
          <div className="detail-row"><span className="detail-key">Supplier</span><span className="detail-val">{selectedVehicle.supplierName || '-'}</span></div>
          <div className="detail-row"><span className="detail-key">Coordinates</span><span className="detail-val">{coordinates}</span></div>
          <div className="detail-row"><span className="detail-key">Device</span><span className="detail-val">{selectedVehicle.deviceName || strings.NO_DATA}</span></div>
          <div className="detail-row"><span className="detail-key">{strings.DEVICE_STATUS}</span><span className="detail-val">{selectedVehicle.deviceStatus || strings.NO_DATA}</span></div>
        </div>
      </div>

      {!selectedVehicle.isLinked && (
        <div className="inline-warning">
          <WarningAmberRoundedIcon fontSize="small" />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}

      <button type="button" className="action-btn primary" onClick={onFocusVehicle}>
        <CenterFocusStrongRoundedIcon fontSize="small" />
        <span>Focus Vehicle On Map</span>
      </button>

      <button type="button" className="action-btn" onClick={onLoadSnapshot} disabled={snapshotLoading || !selectedVehicle.isLinked}>
        <RouteRoundedIcon fontSize="small" />
        <span>{snapshotLoading ? 'Loading snapshot...' : strings.LOAD_SNAPSHOT}</span>
      </button>
    </>
  )

  const renderRouteTab = () => (
    <>
      <div className="form-group">
        <label className="form-label">Time Range</label>
        <div className="date-range-row">
          <input className="form-input" type="datetime-local" value={from} onChange={(event) => onFromChange(event.target.value)} />
          <input className="form-input" type="datetime-local" value={to} onChange={(event) => onToChange(event.target.value)} />
        </div>
      </div>

      <button type="button" className="action-btn primary" onClick={onLoadRoute} disabled={routeLoading || !selectedVehicle.isLinked}>
        <RouteRoundedIcon fontSize="small" />
        <span>{routeLoading ? 'Loading route...' : routeFrames.length > 0 ? 'Reload Route' : 'Load Route'}</span>
      </button>

      {routeSnapMode === 'loading' && <div className="inline-note">Aligning route to nearby roads...</div>}
      {routeSnapMode === 'snapped' && <div className="inline-note">Route playback uses Google Roads alignment for a cleaner path.</div>}
      {routeSnapMode === 'raw' && <div className="inline-note">Showing raw GPS points because road alignment is not available for this route.</div>}

      {routeHasData ? (
        <>
          <div className="timeline-bar">
            <div className="timeline-head">
              <span className="timeline-title">Playback</span>
              <select className="speed-select" value={playbackSpeed} onChange={(event) => onPlaybackSpeedChange(Number.parseInt(event.target.value, 10))}>
                {PLAYBACK_SPEED_OPTIONS.map((value) => (
                  <option key={value} value={value}>{value}x</option>
                ))}
              </select>
            </div>

            <input
              className="timeline-range"
              type="range"
              min={0}
              max={Math.max(routeFrames.length - 1, 0)}
              value={Math.min(playbackIndex, Math.max(routeFrames.length - 1, 0))}
              onChange={(event) => onPlaybackScrub(Number.parseInt(event.target.value, 10))}
            />

            <div className="timeline-stats">
              <div className="tl-stat"><div className="tl-stat-val">{routePositionLabel}</div><div className="tl-stat-label">Position</div></div>
              <div className="tl-stat"><div className="tl-stat-val">{Math.round(playbackSpeedKmh)} km/h</div><div className="tl-stat-label">{strings.SPEED}</div></div>
              <div className="tl-stat"><div className="tl-stat-val">{playbackProgress}%</div><div className="tl-stat-label">Progress</div></div>
            </div>

            <div className="timeline-controls">
              <button type="button" className="tl-btn" onClick={onPlaybackRestart}>
                <RestartAltRoundedIcon fontSize="small" />
              </button>
              <button type="button" className="tl-btn primary" onClick={onPlaybackToggle}>
                {playbackActive ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
              </button>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">{strings.ROUTE_DISTANCE}</div>
              <div className="metric-val metric-val--small">{formatDistanceKm(routeDistanceMeters)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Duration</div>
              <div className="metric-val metric-val--small">{formatDuration(routeDurationMs)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">{strings.AVG_SPEED}</div>
              <div className="metric-val metric-val--small">
                {typeof routeAverageSpeed === 'number' ? Math.round(routeAverageSpeed) : '-'}
                <span>km/h</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">{strings.MAX_SPEED}</div>
              <div className="metric-val metric-val--small">
                {typeof routeMaxSpeed === 'number' ? Math.round(routeMaxSpeed) : '-'}
                <span>km/h</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state compact">
          <p>Load a Traccar route to start playback.</p>
        </div>
      )}
    </>
  )

  const renderZoneStudio = () => {
    if (!zoneStudioOpen) {
      return null
    }

    return (
      <div className="zone-studio">
        <div className="zone-studio-head">
          <strong>{editingGeofenceId ? 'Edit Zone' : 'Create Zone'}</strong>
          <button type="button" className="ghost-link" onClick={onCloseZoneStudio}>Close</button>
        </div>

        <div className="form-group">
          <label className="form-label">{strings.GEOFENCE_NAME}</label>
          <input className="form-input" type="text" value={zoneFormName} onChange={(event) => onZoneNameChange(event.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{strings.DESCRIPTION}</label>
          <input className="form-input" type="text" value={zoneFormDescription} onChange={(event) => onZoneDescriptionChange(event.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{strings.GEOFENCE_TYPE}</label>
          <select className="form-select" value={zoneFormType} onChange={(event) => onZoneTypeChange(event.target.value as GeofenceEditorType)}>
            <option value="circle">{strings.GEOFENCE_TYPE_CIRCLE}</option>
            <option value="polygon">{strings.GEOFENCE_TYPE_POLYGON}</option>
            <option value="polyline">{strings.GEOFENCE_TYPE_POLYLINE}</option>
          </select>
        </div>

        {zoneFormType === 'circle' && (
          <div className="form-group">
            <label className="form-label">{strings.RADIUS_METERS}</label>
            <input className="form-input" type="number" min="1" value={zoneFormRadius} onChange={(event) => onZoneRadiusChange(event.target.value)} />
          </div>
        )}

        {zoneFormType === 'polyline' && (
          <div className="form-group">
            <label className="form-label">{strings.POLYLINE_DISTANCE}</label>
            <input className="form-input" type="number" min="1" value={zoneFormPolylineDistance} onChange={(event) => onZonePolylineDistanceChange(event.target.value)} />
          </div>
        )}

        <div className="zone-studio-actions">
          <button type="button" className="action-btn" onClick={onStartZoneDrawing}>
            <FmdGoodRoundedIcon fontSize="small" />
            <span>{draftReady ? 'Redraw on map' : strings.DRAW_ON_MAP}</span>
          </button>
          <button type="button" className="action-btn" onClick={onClearZoneShape}>
            <LinkOffRoundedIcon fontSize="small" />
            <span>{strings.CLEAR_SHAPE}</span>
          </button>
        </div>

        <div className="inline-note">
          {draftReady ? 'Shape is ready on the map and can be saved.' : strings.DRAW_ON_MAP_HELP}
        </div>

        <button type="button" className="action-btn primary" onClick={onSaveZone} disabled={!draftReady}>
          <AddRoundedIcon fontSize="small" />
          <span>{editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}</span>
        </button>
      </div>
    )
  }

  const renderGeofencesTab = () => (
    <>
      <button type="button" className="action-btn primary" onClick={onOpenCreateZone}>
        <AddRoundedIcon fontSize="small" />
        <span>Create Zone</span>
      </button>

      <button type="button" className="action-btn" onClick={onRefreshZones} disabled={zonesLoading}>
        <RefreshRoundedIcon fontSize="small" />
        <span>{zonesLoading ? 'Refreshing zones...' : 'Refresh Zones'}</span>
      </button>

      <div className="inline-note">
        {linkedGeofences.length}
        {' '}
        linked zones for this vehicle.
      </div>

      {renderZoneStudio()}

      {allGeofences.length > 0 ? (
        <div className="geofence-list">
          {allGeofences.map((geofence, index) => {
            const geofenceId = typeof geofence.id === 'number' ? geofence.id : null
            const linked = geofenceId !== null && linkedGeofenceIds.has(geofenceId)
            const parsedType = geofence.area?.split('(')[0]?.trim()?.toLowerCase()
              || (geofence.geojson ? 'geojson' : `zone ${index + 1}`)

            return (
              <div key={geofence.id || `${geofence.name}-${index}`} className="geo-item">
                <div className="geo-info">
                  <div className="geo-name">{geofence.name || `Zone ${index + 1}`}</div>
                  <div className="geo-type">{parsedType}</div>
                </div>
                <div className="geo-actions">
                  <button
                    type="button"
                    className={`geo-btn ${linked ? 'linked' : ''}`}
                    disabled={!selectedVehicle.isLinked || geofenceId === null}
                    onClick={() => geofenceId !== null && onToggleGeofenceLink(geofenceId, linked)}
                  >
                    {linked ? 'Linked' : 'Link'}
                  </button>
                  <button type="button" className="geo-btn" onClick={() => onOpenEditZone(geofence)}>
                    <EditRoundedIcon fontSize="small" />
                    <span>Edit</span>
                  </button>
                  {geofenceId !== null && (
                    <button type="button" className="geo-btn geo-btn--danger" onClick={() => onDeleteZone(geofenceId)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>{strings.NO_GEOFENCES}</p>
        </div>
      )}

      {!canManageTracking && (
        <div className="inline-warning">
          <WarningAmberRoundedIcon fontSize="small" />
          <span>{strings.TRACKING_NOT_LINKED}</span>
        </div>
      )}
    </>
  )

  const renderEventsTab = () => (
    <>
      <div className="date-range-row" style={{ marginBottom: 10 }}>
        <input className="form-input" type="datetime-local" value={from} onChange={(event) => onFromChange(event.target.value)} />
        <input className="form-input" type="datetime-local" value={to} onChange={(event) => onToChange(event.target.value)} />
      </div>

      <select className="form-select" value={eventTypeFilter} onChange={(event) => onEventTypeChange(event.target.value as (typeof EVENT_TYPE_OPTIONS)[number])}>
        {EVENT_TYPE_OPTIONS.map((value) => (
          <option key={value} value={value}>{getEventTypeLabel(value)}</option>
        ))}
      </select>

      <button type="button" className="action-btn primary" onClick={onLoadEvents} disabled={eventsLoading || !selectedVehicle.isLinked}>
        <RefreshRoundedIcon fontSize="small" />
        <span>{eventsLoading ? 'Loading events...' : 'Load Events'}</span>
      </button>

      {events.length > 0 ? (
        <div className="events-list">
          {events.map((event, index) => (
            <div key={event.id || `${event.deviceId}-${event.eventTime}-${index}`} className="event-item">
              <div className="event-dot" style={{ background: getStatusColor(selectedVehicle.status) }} />
              <div className="event-content">
                <div className="event-type">{getEventTypeLabel(event.type)}</div>
                <div className="event-meta">
                  <span>{event.geofenceName || event.address || event.deviceName || strings.NO_DATA}</span>
                  {typeof event.speed === 'number' && <span>{`${strings.SPEED}: ${Math.round(event.speed)} km/h`}</span>}
                </div>
              </div>
              <div className="event-time">{formatTimestamp(event.eventTime)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>No events loaded for this vehicle yet.</p>
        </div>
      )}
    </>
  )

  const renderDeviceTab = () => (
    <>
      <div className="section-card">
        <div className="section-card-head">
          <span className="section-card-title">Device Binding</span>
        </div>
        <div className="section-card-body">
          <div className="form-group">
            <label className="form-label">{strings.DEVICE_ID}</label>
            <input
              className="form-input"
              list="tracking-device-list"
              type="text"
              value={deviceId}
              placeholder="e.g. 142"
              onChange={(event) => onDeviceIdChange(event.target.value)}
            />
            <datalist id="tracking-device-list">
              {devices.map((device) => (
                <option key={device.id} value={device.id}>{device.name}</option>
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">{strings.DEVICE_NAME}</label>
            <input className="form-input" type="text" value={deviceName} placeholder="e.g. Teltonika FMC130" onChange={(event) => onDeviceNameChange(event.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">{strings.NOTES}</label>
            <input className="form-input" type="text" value={notes} placeholder="Optional notes..." onChange={(event) => onNotesChange(event.target.value)} />
          </div>

          <button type="button" className="action-btn primary" onClick={onLinkDevice} disabled={deviceSaving}>
            <LinkRoundedIcon fontSize="small" />
            <span>{deviceSaving ? 'Saving...' : strings.LINK_DEVICE}</span>
          </button>
          <button type="button" className="action-btn danger" onClick={onUnlinkDevice} disabled={deviceSaving || !selectedVehicle.isLinked}>
            <LinkOffRoundedIcon fontSize="small" />
            <span>{strings.UNLINK_DEVICE}</span>
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-head">
          <span className="section-card-title">{strings.COMMAND_CENTER}</span>
        </div>
        <div className="section-card-body">
          <div className="form-group">
            <label className="form-label">{strings.COMMAND_TYPE}</label>
            <select className="form-select" value={selectedCommandType} onChange={(event) => onCommandTypeChange(event.target.value)}>
              {commandTypes.length === 0
                ? <option value="">No command types</option>
                : commandTypes.map((commandType) => (
                  <option key={commandType.type} value={commandType.type}>{commandType.type}</option>
                ))}
            </select>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={commandTextChannel} onChange={(event) => onCommandTextChannelChange(event.target.checked)} />
            <span>{strings.TEXT_CHANNEL}</span>
          </label>

          <div className="form-group">
            <label className="form-label">{strings.COMMAND_ATTRIBUTES}</label>
            <textarea className="form-textarea" rows={6} value={commandAttributes} onChange={(event) => onCommandAttributesChange(event.target.value)} />
          </div>

          <button type="button" className="action-btn" onClick={onSendCommand} disabled={commandSending || !selectedCommandType || !selectedVehicle.isLinked}>
            <SendRoundedIcon fontSize="small" />
            <span>{commandSending ? 'Sending...' : strings.SEND_COMMAND}</span>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="sb-view active" id="car-view">
      <div className="cv-header">
        <button type="button" className="cv-back" onClick={onBack}>
          <ArrowBackRoundedIcon fontSize="small" />
          <span>Back to fleet</span>
        </button>

        <div className="cv-car-row">
          <div
            className="cv-car-icon"
            style={{
              background: `${getStatusColor(selectedVehicle.status)}22`,
              color: getStatusColor(selectedVehicle.status),
            }}
          >
            {getInitials(selectedVehicle.car.name)}
          </div>
          <div className="cv-car-info">
            <div className="cv-car-name">{selectedVehicle.car.name}</div>
            <div className="cv-car-plate">{selectedVehicle.car.licensePlate || '---'}</div>
          </div>
          <div className={`status-badge ${selectedVehicle.status}`}>{getStatusLabel(selectedVehicle.status)}</div>
        </div>
      </div>

      <div className="cv-tabs" id="cv-tabs">
        {(['status', 'route', 'geofences', 'events', 'device'] as TrackingTab[]).map((tab) => (
          <button
            type="button"
            key={tab}
            className={`cv-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {tab === 'status' && 'Status'}
            {tab === 'route' && 'Route'}
            {tab === 'geofences' && 'Zones'}
            {tab === 'events' && 'Events'}
            {tab === 'device' && 'Device'}
          </button>
        ))}
      </div>

      <div className="cv-body">
        {activeTab === 'status' && renderStatusTab()}
        {activeTab === 'route' && renderRouteTab()}
        {activeTab === 'geofences' && renderGeofencesTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'device' && renderDeviceTab()}
      </div>
    </div>
  )
}

export default VehiclePanel
