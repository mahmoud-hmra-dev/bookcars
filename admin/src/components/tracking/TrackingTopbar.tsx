import React from 'react'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import RadarRoundedIcon from '@mui/icons-material/RadarRounded'
import { strings } from '@/lang/tracking'
import type { FleetCounts } from './types'

type TopbarStatus = 'all' | 'moving' | 'idle' | 'stopped' | 'offline'

type TrackingTopbarProps = {
  brandTitle: string
  searchValue: string
  refreshing: boolean
  integrationEnabled: boolean
  activeStatus: TopbarStatus | null
  counts: Pick<FleetCounts, 'total' | 'moving' | 'idle' | 'stopped' | 'offline'>
  onSearchChange: (value: string) => void
  onStatusChange: (status: TopbarStatus) => void
  onRefresh: () => void
}

const TrackingTopbar = ({
  brandTitle,
  searchValue,
  refreshing,
  integrationEnabled,
  activeStatus,
  counts,
  onSearchChange,
  onStatusChange,
  onRefresh,
}: TrackingTopbarProps) => {
  const items: Array<{
    id: TopbarStatus
    label: string
    value: number
    dotClass: string
  }> = [
    { id: 'all', label: 'Total', value: counts.total, dotClass: 'moving' },
    { id: 'moving', label: strings.STATUS_MOVING, value: counts.moving, dotClass: 'moving' },
    { id: 'idle', label: strings.STATUS_IDLE, value: counts.idle, dotClass: 'idle' },
    { id: 'stopped', label: strings.STATUS_STOPPED, value: counts.stopped, dotClass: 'stopped' },
    { id: 'offline', label: strings.STATUS_OFFLINE, value: counts.offline, dotClass: 'offline' },
  ]

  return (
    <header id="topbar">
      <div className="tb-logo">
        <div className="tb-logo-icon">
          <RadarRoundedIcon fontSize="small" />
        </div>
        <div className="tb-logo-text">
          <strong>{brandTitle}</strong>
          <span>Command Center</span>
        </div>
      </div>

      <div className="tb-search">
        <SearchRoundedIcon fontSize="small" />
        <input
          id="global-search"
          type="text"
          placeholder="Search vehicle, plate, supplier..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="tb-stats" id="tb-stats">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`tb-stat${activeStatus === item.id ? ' active' : ''}`}
            onClick={() => onStatusChange(item.id)}
          >
            <span className={`tb-stat-dot ${item.dotClass}`} />
            <span className="tb-stat-val">{item.value}</span>
            <span className="tb-stat-lbl">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="tb-right">
        <button type="button" className="tb-refresh-btn" onClick={onRefresh} disabled={refreshing}>
          <RefreshRoundedIcon fontSize="small" />
          <span>{refreshing ? 'Refreshing...' : strings.REFRESH_FLEET}</span>
        </button>

        <div className={`sys-badge ${integrationEnabled ? 'online' : 'offline'}`} id="sys-badge">
          <span className="sys-badge-dot" />
          <span>{integrationEnabled ? strings.SYSTEM_ONLINE : strings.SYSTEM_OFFLINE}</span>
        </div>
      </div>
    </header>
  )
}

export default TrackingTopbar
