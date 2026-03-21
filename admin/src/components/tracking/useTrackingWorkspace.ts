import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import { snapRouteToRoads, type RoadPoint } from '@/utils/googleRoads'
import * as CarService from '@/services/CarService'
import * as SupplierService from '@/services/SupplierService'
import * as TraccarService from '@/services/TraccarService'
import type {
  DraftGeofenceShape,
  GeofenceEditorType,
  LatLngTuple,
  ParsedGeofence,
  SidebarView,
  TrackingMapType,
  TrackingTab,
} from './types'
import {
  CARS_FETCH_SIZE,
  EVENT_CENTER_LIMIT,
  EVENT_TYPE_OPTIONS,
  LIVE_REFRESH_INTERVAL_MS,
  PLAYBACK_SPEED_OPTIONS,
  buildFleetCounts,
  buildFleetVehicles,
  buildGeofencePayload,
  buildRouteFrames,
  calculateBearing,
  formatDateInput,
  parseEditableGeofence,
  parseGeofenceArea,
} from './utils'

type RouteSnapState = {
  displayPoints: LatLngTuple[]
  playbackPoints: LatLngTuple[]
  mode: 'idle' | 'loading' | 'snapped' | 'raw'
}

const DEFAULT_COMMAND_ATTRIBUTES = '{\n  "data": ""\n}'

const extractResultPage = (data: unknown) => {
  const payload = Array.isArray(data) && data.length > 0
    ? data[0] as { resultData?: bookcarsTypes.Car[], pageInfo?: Array<{ totalRecords?: number }> }
    : undefined
  const rows = Array.isArray(payload?.resultData) ? payload.resultData : []
  const totalRecords = Array.isArray(payload?.pageInfo) && payload.pageInfo.length > 0
    ? (payload.pageInfo[0]?.totalRecords || 0)
    : rows.length

  return { rows, totalRecords }
}

export const useTrackingWorkspace = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [initializing, setInitializing] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [fleetOverview, setFleetOverview] = useState<bookcarsTypes.TraccarFleetItem[]>([])
  const [fleetHealth, setFleetHealth] = useState<bookcarsTypes.TraccarFleetHealth | null>(null)
  const [devices, setDevices] = useState<bookcarsTypes.TraccarDevice[]>([])
  const [allGeofences, setAllGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [linkedGeofences, setLinkedGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [events, setEvents] = useState<bookcarsTypes.TraccarEventCenterEntry[]>([])

  const [selectedCarId, setSelectedCarId] = useState('')
  const [sidebarView, setSidebarView] = useState<SidebarView>('fleet')
  const [activeTab, setActiveTab] = useState<TrackingTab>('status')
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearch = useDeferredValue(searchQuery)
  const [statusFilter, setStatusFilter] = useState<'all' | bookcarsTypes.TraccarFleetStatus>('all')

  const [mapType, setMapType] = useState<TrackingMapType>('roadmap')
  const [clustersEnabled, setClustersEnabled] = useState(true)
  const [mapFocusMode, setMapFocusMode] = useState<'fleet' | 'selected'>('fleet')
  const [mapFitToken, setMapFitToken] = useState(0)

  const now = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(formatDateInput(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
  const [to, setTo] = useState(formatDateInput(now))

  const [positions, setPositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [route, setRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [reports, setReports] = useState<bookcarsTypes.TraccarVehicleReportBundle>({ summary: null, trips: [], stops: [] })
  const [routeSnap, setRouteSnap] = useState<RouteSnapState>({ displayPoints: [], playbackPoints: [], mode: 'idle' })
  const [routeLoading, setRouteLoading] = useState(false)
  const [snapshotLoading, setSnapshotLoading] = useState(false)

  const [playbackActive, setPlaybackActive] = useState(false)
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEED_OPTIONS[2])

  const [zonesLoading, setZonesLoading] = useState(false)
  const [zoneStudioOpen, setZoneStudioOpen] = useState(false)
  const [editingGeofenceId, setEditingGeofenceId] = useState<number | null>(null)
  const [zoneFormName, setZoneFormName] = useState('')
  const [zoneFormDescription, setZoneFormDescription] = useState('')
  const [zoneFormType, setZoneFormType] = useState<GeofenceEditorType>('circle')
  const [zoneFormRadius, setZoneFormRadius] = useState('200')
  const [zoneFormPolylineDistance, setZoneFormPolylineDistance] = useState('25')
  const [zoneDraft, setZoneDraft] = useState<DraftGeofenceShape | null>(null)
  const [zoneDrawingMode, setZoneDrawingMode] = useState<GeofenceEditorType | null>(null)

  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState<(typeof EVENT_TYPE_OPTIONS)[number]>('all')

  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [notes, setNotes] = useState('')
  const [deviceSaving, setDeviceSaving] = useState(false)

  const [commandTypes, setCommandTypes] = useState<bookcarsTypes.TraccarCommandType[]>([])
  const [selectedCommandType, setSelectedCommandType] = useState('')
  const [commandTextChannel, setCommandTextChannel] = useState(false)
  const [commandAttributes, setCommandAttributes] = useState(DEFAULT_COMMAND_ATTRIBUTES)
  const [commandSending, setCommandSending] = useState(false)

  const selectedCar = useMemo(() => cars.find((item) => item._id === selectedCarId) || null, [cars, selectedCarId])

  const fleetVehicles = useMemo(() => (
    buildFleetVehicles({
      cars,
      fleetOverview,
      currentPositions: positions,
      selectedCarId,
    })
  ), [cars, fleetOverview, positions, selectedCarId])

  const selectedVehicle = useMemo(() => fleetVehicles.find((item) => item.car._id === selectedCarId) || null, [fleetVehicles, selectedCarId])
  const counts = useMemo(() => buildFleetCounts(fleetVehicles), [fleetVehicles])

  const filteredVehicles = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return fleetVehicles.filter((vehicle) => (
      (statusFilter === 'all' || vehicle.status === statusFilter)
      && (
        query === ''
        || `${vehicle.car.name} ${vehicle.car.licensePlate || ''} ${vehicle.supplierName} ${vehicle.deviceName}`.toLowerCase().includes(query)
      )
    ))
  }, [deferredSearch, fleetVehicles, statusFilter])

  const managedGeofences = useMemo(() => (
    [...allGeofences].sort((left, right) => (left.name || '').localeCompare(right.name || ''))
  ), [allGeofences])

  const linkedGeofenceIds = useMemo(() => (
    new Set(linkedGeofences.map((geofence) => geofence.id).filter((id): id is number => typeof id === 'number'))
  ), [linkedGeofences])

  const geofenceShapes = useMemo(() => (
    linkedGeofences
      .map((geofence, index) => parseGeofenceArea(geofence, index))
      .filter((shape): shape is ParsedGeofence => shape !== null)
  ), [linkedGeofences])

  const allGeofenceShapes = useMemo(() => (
    managedGeofences
      .map((geofence, index) => parseGeofenceArea(geofence, index))
      .filter((shape): shape is ParsedGeofence => shape !== null)
  ), [managedGeofences])

  const visibleGeofenceShapes = useMemo(() => (
    (() => {
      const baseShapes = sidebarView === 'vehicle' && activeTab === 'geofences'
        ? allGeofenceShapes
        : geofenceShapes

      return editingGeofenceId === null
        ? baseShapes
        : baseShapes.filter((shape) => `${shape.id}` !== `${editingGeofenceId}`)
    })()
  ), [activeTab, allGeofenceShapes, editingGeofenceId, geofenceShapes, sidebarView])

  const routeFrames = useMemo(() => buildRouteFrames(route), [route])
  const rawRoutePoints = useMemo(() => routeFrames.map((frame) => frame.point), [routeFrames])
  const routePathPoints = useMemo(() => (
    routeSnap.displayPoints.length > 1 ? routeSnap.displayPoints : rawRoutePoints
  ), [rawRoutePoints, routeSnap.displayPoints])

  const boundedPlaybackIndex = routeFrames.length > 0 ? Math.min(playbackIndex, routeFrames.length - 1) : 0
  const playbackFrame = routeFrames[boundedPlaybackIndex] || null
  const playbackPoint = routeSnap.playbackPoints[boundedPlaybackIndex] || playbackFrame?.point || null
  const nextPlaybackPoint = routeSnap.playbackPoints[boundedPlaybackIndex + 1] || routeFrames[boundedPlaybackIndex + 1]?.point || null
  const playbackHeading = playbackPoint && nextPlaybackPoint
    ? calculateBearing(playbackPoint, nextPlaybackPoint)
    : null
  const playbackSpeedKmh = playbackFrame?.speedKmh || 0
  const playbackProgress = routeFrames.length > 1
    ? Math.round((boundedPlaybackIndex / (routeFrames.length - 1)) * 100)
    : 0

  const routeDistanceMeters = reports.summary?.distance
    ?? reports.trips.reduce((sum, trip) => sum + (trip.distance || 0), 0)
  const routeDurationMs = reports.trips.length > 0
    ? reports.trips.reduce((sum, trip) => sum + (trip.duration || 0), 0)
    : routeFrames.length > 1 && routeFrames[0].timestampMs > 0 && routeFrames[routeFrames.length - 1].timestampMs > 0
      ? routeFrames[routeFrames.length - 1].timestampMs - routeFrames[0].timestampMs
      : null
  const routeAverageSpeed = reports.summary?.averageSpeed
    ?? (routeFrames.length > 0 ? routeFrames.reduce((sum, frame) => sum + frame.speedKmh, 0) / routeFrames.length : null)
  const routeMaxSpeed = reports.summary?.maxSpeed
    ?? (routeFrames.length > 0 ? Math.max(...routeFrames.map((frame) => frame.speedKmh)) : null)

  const topbarActiveStatus = statusFilter === 'moving'
    || statusFilter === 'idle'
    || statusFilter === 'stopped'
    || statusFilter === 'offline'
    || statusFilter === 'all'
    ? statusFilter
    : null

  const hasMapData = filteredVehicles.some((vehicle) => vehicle.point)
    || !!selectedVehicle?.point
    || routePathPoints.length > 0
    || visibleGeofenceShapes.length > 0
    || !!zoneDraft

  const resetRouteState = () => {
    setRoute([])
    setReports({ summary: null, trips: [], stops: [] })
    setRouteSnap({ displayPoints: [], playbackPoints: [], mode: 'idle' })
    setPlaybackActive(false)
    setPlaybackIndex(0)
  }

  const resetZoneStudio = () => {
    setZoneStudioOpen(false)
    setEditingGeofenceId(null)
    setZoneFormName('')
    setZoneFormDescription('')
    setZoneFormType('circle')
    setZoneFormRadius('200')
    setZoneFormPolylineDistance('25')
    setZoneDraft(null)
    setZoneDrawingMode(null)
  }

  const resetDetailState = () => {
    setPositions([])
    setLinkedGeofences([])
    setEvents([])
    resetRouteState()
    resetZoneStudio()
  }

  const focusMap = (mode: 'fleet' | 'selected') => {
    setMapFocusMode(mode)
    setMapFitToken((value) => value + 1)
  }

  const loadCars = async () => {
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

    const firstPage = await CarService.getCars('', payload, 1, CARS_FETCH_SIZE)
    const { rows: firstRows, totalRecords } = extractResultPage(firstPage)
    const totalPages = Math.max(1, Math.ceil(totalRecords / CARS_FETCH_SIZE))

    if (totalPages === 1) {
      return firstRows
    }

    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2)
    const remainingPages = await Promise.all(pageNumbers.map((pageNumber) => CarService.getCars('', payload, pageNumber, CARS_FETCH_SIZE)))
    return [...firstRows, ...remainingPages.flatMap((pageData) => extractResultPage(pageData).rows)]
  }

  const loadFleetOverview = async () => {
    if (!integrationEnabled) {
      setFleetOverview([])
      setFleetHealth(null)
      return
    }

    const result = await TraccarService.getFleetOverview()
    setFleetOverview(result.items)
    setFleetHealth(result.health)
  }

  const loadDevices = async () => {
    if (!integrationEnabled) {
      setDevices([])
      return
    }
    setDevices(await TraccarService.getDevices())
  }

  const loadAllGeofences = async () => {
    if (!integrationEnabled) {
      setAllGeofences([])
      return
    }
    setAllGeofences(await TraccarService.getAllGeofences())
  }

  const loadLinkedGeofences = async (carId = selectedCarId) => {
    if (!integrationEnabled || !carId) {
      setLinkedGeofences([])
      return
    }

    const car = cars.find((item) => item._id === carId)
    if (!car?.tracking?.deviceId) {
      setLinkedGeofences([])
      return
    }

    setLinkedGeofences(await TraccarService.getGeofences(carId))
  }

  const loadCommandTypes = async (carId = selectedCarId) => {
    if (!integrationEnabled || !carId) {
      setCommandTypes([])
      setSelectedCommandType('')
      return
    }

    const car = cars.find((item) => item._id === carId)
    if (!car?.tracking?.deviceId) {
      setCommandTypes([])
      setSelectedCommandType('')
      return
    }

    const types = await TraccarService.getCommandTypes(carId)
    setCommandTypes(types)
    setSelectedCommandType((current) => (
      current && types.some((type) => type.type === current) ? current : (types[0]?.type || '')
    ))
  }

  const loadEvents = async (carId = selectedCarId) => {
    if (!integrationEnabled || !carId) {
      setEvents([])
      return
    }

    const car = cars.find((item) => item._id === carId)
    if (!car?.tracking?.deviceId) {
      setEvents([])
      return
    }

    setEvents(await TraccarService.getEventCenter({
      carId,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      types: eventTypeFilter === 'all' ? undefined : [eventTypeFilter],
      limit: EVENT_CENTER_LIMIT,
    }))
  }

  const refreshWorkspace = async ({ withCars = false, withMetadata = false }: { withCars?: boolean, withMetadata?: boolean } = {}) => {
    setRefreshing(true)
    try {
      const tasks: Promise<unknown>[] = [loadFleetOverview()]
      if (withCars) {
        tasks.push(loadCars().then(setCars))
      }
      if (withMetadata) {
        tasks.push(loadDevices(), loadAllGeofences())
      }

      await Promise.all(tasks)
    } catch (err) {
      helper.error(err)
    } finally {
      setRefreshing(false)
    }
  }

  const openVehicle = (carId: string, tab: TrackingTab = 'status') => {
    if (selectedCarId !== carId) {
      resetDetailState()
    }

    setSelectedCarId(carId)
    setSidebarView('vehicle')
    setActiveTab(tab)
    focusMap('selected')
  }

  const backToFleet = () => {
    setSidebarView('fleet')
    setActiveTab('status')
    focusMap('fleet')
  }

  const handleStatusFilter = (status: 'all' | bookcarsTypes.TraccarFleetStatus) => {
    setStatusFilter(status)
    setSidebarView('fleet')
    focusMap('fleet')
  }

  const handleLoadRoute = async () => {
    if (!selectedCar) {
      return
    }

    setRouteLoading(true)
    try {
      const [routeData, reportsData] = await Promise.all([
        TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()),
        TraccarService.getVehicleReports(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()),
      ])

      setRoute(routeData)
      setReports(reportsData)
      setPlaybackActive(false)
      setPlaybackIndex(0)
      focusMap('selected')
    } catch (err) {
      helper.error(err)
    } finally {
      setRouteLoading(false)
    }
  }

  const handleLoadSnapshot = async () => {
    if (!selectedCar) {
      return
    }

    setSnapshotLoading(true)
    try {
      const [positionData, routeData, geofenceData, reportsData, eventData] = await Promise.all([
        TraccarService.getPositions(selectedCar._id),
        TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()),
        TraccarService.getGeofences(selectedCar._id),
        TraccarService.getVehicleReports(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()),
        TraccarService.getEventCenter({
          carId: selectedCar._id,
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
          types: eventTypeFilter === 'all' ? undefined : [eventTypeFilter],
          limit: EVENT_CENTER_LIMIT,
        }),
      ])

      setPositions(positionData)
      setRoute(routeData)
      setReports(reportsData)
      setLinkedGeofences(geofenceData)
      setEvents(eventData)
      setPlaybackActive(false)
      setPlaybackIndex(0)
      focusMap('selected')
    } catch (err) {
      helper.error(err)
    } finally {
      setSnapshotLoading(false)
    }
  }

  const handleLoadEvents = async () => {
    if (!selectedCar) {
      return
    }

    setEventsLoading(true)
    try {
      await loadEvents(selectedCar._id)
    } catch (err) {
      helper.error(err)
    } finally {
      setEventsLoading(false)
    }
  }

  const handleRefreshZones = async () => {
    if (!selectedCar) {
      return
    }

    setZonesLoading(true)
    try {
      await Promise.all([loadAllGeofences(), loadLinkedGeofences(selectedCar._id)])
    } catch (err) {
      helper.error(err)
    } finally {
      setZonesLoading(false)
    }
  }

  const handleOpenCreateZone = () => {
    setActiveTab('geofences')
    setZoneStudioOpen(true)
    setEditingGeofenceId(null)
    setZoneFormName('')
    setZoneFormDescription('')
    setZoneFormType('circle')
    setZoneFormRadius('200')
    setZoneFormPolylineDistance('25')
    setZoneDraft(null)
    setZoneDrawingMode(null)
    focusMap('selected')
  }

  const handleOpenEditZone = (geofence: bookcarsTypes.TraccarGeofence) => {
    const draft = parseEditableGeofence(geofence)
    if (!draft) {
      helper.error(null, 'Unsupported geofence format')
      return
    }

    setActiveTab('geofences')
    setZoneStudioOpen(true)
    setEditingGeofenceId(typeof geofence.id === 'number' ? geofence.id : null)
    setZoneFormName(geofence.name || '')
    setZoneFormDescription(geofence.description || '')
    setZoneFormType(draft.type)
    setZoneFormRadius(draft.type === 'circle' ? `${Math.round(draft.radius * 100) / 100}` : '200')
    setZoneFormPolylineDistance(`${typeof geofence.attributes?.polylineDistance === 'number' ? geofence.attributes.polylineDistance : 25}`)
    setZoneDraft(draft)
    setZoneDrawingMode(null)
    focusMap('selected')
  }

  const handleZoneTypeChange = (value: GeofenceEditorType) => {
    setZoneFormType(value)
    setZoneDrawingMode(null)
    if (zoneDraft && zoneDraft.type !== value) {
      setZoneDraft(null)
    }
  }

  const handleZoneRadiusChange = (value: string) => {
    setZoneFormRadius(value)
    const radius = Number.parseFloat(value)
    if (zoneDraft?.type === 'circle' && Number.isFinite(radius) && radius > 0) {
      setZoneDraft({ ...zoneDraft, radius })
    }
  }

  const handleStartZoneDrawing = () => {
    const nextDrawingMode = zoneDrawingMode === zoneFormType ? null : zoneFormType
    if (nextDrawingMode) {
      setZoneDraft(null)
    }
    setZoneDrawingMode(nextDrawingMode)
    focusMap('selected')
  }

  const handleSaveZone = async () => {
    if (!selectedCar) {
      return
    }

    setZonesLoading(true)
    try {
      const payload = buildGeofencePayload({
        name: zoneFormName,
        description: zoneFormDescription,
        type: zoneFormType,
        draft: zoneDraft,
        radiusText: zoneFormRadius,
        polylineDistanceText: zoneFormPolylineDistance,
      })

      if (editingGeofenceId) {
        await TraccarService.updateGeofence(editingGeofenceId, payload)
      } else {
        await TraccarService.createGeofence(payload)
      }

      await Promise.all([loadAllGeofences(), loadLinkedGeofences(selectedCar._id)])
      resetZoneStudio()
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setZonesLoading(false)
    }
  }

  const handleDeleteZone = async (geofenceId: number) => {
    if (!window.confirm(strings.DELETE_GEOFENCE_CONFIRM || 'Delete this geofence?')) {
      return
    }

    setZonesLoading(true)
    try {
      await TraccarService.deleteGeofence(geofenceId)
      if (selectedCar) {
        await Promise.all([loadAllGeofences(), loadLinkedGeofences(selectedCar._id)])
      } else {
        await loadAllGeofences()
      }

      if (editingGeofenceId === geofenceId) {
        resetZoneStudio()
      }

      helper.info(strings.GEOFENCE_DELETED || commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setZonesLoading(false)
    }
  }

  const handleToggleGeofenceLink = async (geofenceId: number, linked: boolean) => {
    if (!selectedCar) {
      return
    }

    setZonesLoading(true)
    try {
      const nextLinked = linked
        ? await TraccarService.unlinkGeofence(selectedCar._id, geofenceId)
        : await TraccarService.linkGeofence(selectedCar._id, geofenceId)
      setLinkedGeofences(nextLinked)
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setZonesLoading(false)
    }
  }

  const handleLinkDevice = async () => {
    if (!selectedCar || !deviceId.trim()) {
      helper.error(null, commonStrings.FIELD_NOT_VALID)
      return
    }

    setDeviceSaving(true)
    try {
      const tracking = await TraccarService.linkDevice(selectedCar._id, {
        deviceId: Number.parseInt(deviceId, 10),
        deviceName,
        notes,
        enabled: true,
      })

      setCars((prev) => prev.map((car) => (car._id === selectedCar._id ? { ...car, tracking } : car)))
      await Promise.all([loadFleetOverview(), loadDevices()])
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setDeviceSaving(false)
    }
  }

  const handleUnlinkDevice = async () => {
    if (!selectedCar) {
      return
    }

    setDeviceSaving(true)
    try {
      const tracking = await TraccarService.unlinkDevice(selectedCar._id)
      setCars((prev) => prev.map((car) => (car._id === selectedCar._id ? { ...car, tracking } : car)))
      resetDetailState()
      await loadFleetOverview()
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setDeviceSaving(false)
    }
  }

  const handleSendCommand = async () => {
    if (!selectedCar || !selectedCommandType) {
      return
    }

    let parsedAttributes: Record<string, any> = {}
    try {
      parsedAttributes = commandAttributes.trim() ? JSON.parse(commandAttributes) : {}
    } catch {
      helper.error(null, commonStrings.FIELD_NOT_VALID)
      return
    }

    setCommandSending(true)
    try {
      await TraccarService.sendCommand(selectedCar._id, {
        type: selectedCommandType,
        textChannel: commandTextChannel,
        attributes: parsedAttributes,
      })
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setCommandSending(false)
    }
  }

  const handleExport = () => {
    const rows = filteredVehicles.map((vehicle) => [
      vehicle.car.name,
      vehicle.car.licensePlate || '',
      vehicle.supplierName,
      vehicle.status,
      vehicle.deviceName,
      Math.round(vehicle.speedKmh),
      vehicle.lastSeenLabel,
    ])

    const csv = [
      ['Name', 'License Plate', 'Supplier', 'Status', 'Device', 'Speed (km/h)', 'Last Seen'].join(','),
      ...rows.map((row) => row.map((value) => `${value ?? ''}`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'fleet-tracking-export.csv'
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const handleOpenGeofenceManager = () => {
    const fallback = selectedVehicle?.car._id || filteredVehicles[0]?.car._id || cars[0]?._id
    if (fallback) {
      openVehicle(fallback, 'geofences')
    }
  }

  useEffect(() => {
    if (!selectedCar) {
      setDeviceId('')
      setDeviceName('')
      setNotes('')
      return
    }

    setDeviceId(selectedCar.tracking?.deviceId ? `${selectedCar.tracking.deviceId}` : '')
    setDeviceName(selectedCar.tracking?.deviceName || '')
    setNotes(selectedCar.tracking?.notes || '')
  }, [selectedCar])

  useEffect(() => {
    if (zoneDraft?.type !== 'circle') {
      return
    }

    const nextRadius = `${Math.round(zoneDraft.radius * 100) / 100}`
    setZoneFormRadius((current) => (current === nextRadius ? current : nextRadius))
  }, [zoneDraft])

  useEffect(() => {
    const match = commandTypes.find((type) => type.type === selectedCommandType)
    if (match && typeof match.textChannel === 'boolean') {
      setCommandTextChannel(match.textChannel)
    }
  }, [commandTypes, selectedCommandType])

  useEffect(() => {
    if (activeTab !== 'device' || !selectedCar) {
      return
    }

    void loadCommandTypes(selectedCar._id).catch(() => {})
  }, [activeTab, selectedCar]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'geofences' || !selectedCar) {
      return
    }

    setZonesLoading(true)
    void Promise.all([loadAllGeofences(), loadLinkedGeofences(selectedCar._id)])
      .catch(() => {})
      .finally(() => setZonesLoading(false))
  }, [activeTab, selectedCar]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true

    setPlaybackActive(false)
    setPlaybackIndex(0)

    if (rawRoutePoints.length < 2) {
      setRouteSnap({ displayPoints: rawRoutePoints, playbackPoints: rawRoutePoints, mode: 'idle' })
      return () => {
        active = false
      }
    }

    setRouteSnap({ displayPoints: rawRoutePoints, playbackPoints: rawRoutePoints, mode: 'loading' })

    const snapRoute = async () => {
      try {
        const result = await snapRouteToRoads(rawRoutePoints as RoadPoint[], env.GOOGLE_MAPS_API_KEY)
        if (active) {
          setRouteSnap({
            displayPoints: result.displayPoints,
            playbackPoints: result.playbackPoints,
            mode: 'snapped',
          })
        }
      } catch {
        if (active) {
          setRouteSnap({ displayPoints: rawRoutePoints, playbackPoints: rawRoutePoints, mode: 'raw' })
        }
      }
    }

    void snapRoute()

    return () => {
      active = false
    }
  }, [rawRoutePoints])

  useEffect(() => {
    if (!playbackActive || routeFrames.length < 2) {
      return
    }

    if (boundedPlaybackIndex >= routeFrames.length - 1) {
      setPlaybackActive(false)
      return
    }

    const currentFrame = routeFrames[boundedPlaybackIndex]
    const nextFrame = routeFrames[boundedPlaybackIndex + 1]
    const deltaMs = currentFrame.timestampMs > 0 && nextFrame.timestampMs > currentFrame.timestampMs
      ? nextFrame.timestampMs - currentFrame.timestampMs
      : 4000
    const delay = Math.max(140, Math.min(1200, deltaMs / playbackSpeed))

    const timer = window.setTimeout(() => {
      setPlaybackIndex((value) => Math.min(value + 1, routeFrames.length - 1))
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [boundedPlaybackIndex, playbackActive, playbackSpeed, routeFrames])

  useEffect(() => {
    if (!user || !integrationEnabled) {
      return
    }

    const timer = window.setInterval(() => {
      void loadFleetOverview().catch(() => {})
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [integrationEnabled, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = async (loadedUser?: bookcarsTypes.User) => {
    if (!loadedUser || !loadedUser.verified) {
      return
    }

    setUser(loadedUser)
    setInitializing(true)

    try {
      const status = await TraccarService.getStatus()
      setIntegrationEnabled(status.enabled)

      const loadedCars = await loadCars()
      setCars(loadedCars)

      const defaultCar = loadedCars.find((car) => car.tracking?.deviceId) || loadedCars[0]
      if (defaultCar) {
        setSelectedCarId(defaultCar._id)
      }

      if (status.enabled) {
        const [fleetResult, devicesResult, geofencesResult] = await Promise.allSettled([
          TraccarService.getFleetOverview(),
          TraccarService.getDevices(),
          TraccarService.getAllGeofences(),
        ])

        if (fleetResult.status === 'fulfilled') {
          setFleetOverview(fleetResult.value.items)
          setFleetHealth(fleetResult.value.health)
        }
        if (devicesResult.status === 'fulfilled') {
          setDevices(devicesResult.value)
        }
        if (geofencesResult.status === 'fulfilled') {
          setAllGeofences(geofencesResult.value)
        }
      }
    } catch (err) {
      helper.error(err)
      setIntegrationEnabled(false)
    } finally {
      setInitializing(false)
    }
  }

  return {
    user,
    initializing,
    integrationEnabled,
    refreshing,
    onLoad,
    searchQuery,
    setSearchQuery,
    topbarActiveStatus,
    counts,
    statusFilter,
    handleStatusFilter,
    refreshWorkspace,
    sidebarView,
    activeTab,
    setActiveTab,
    selectedCarId,
    selectedVehicle,
    filteredVehicles,
    managedGeofences,
    linkedGeofences,
    linkedGeofenceIds,
    events,
    eventTypeFilter,
    setEventTypeFilter,
    devices,
    deviceId,
    setDeviceId,
    deviceName,
    setDeviceName,
    notes,
    setNotes,
    commandTypes,
    selectedCommandType,
    setSelectedCommandType,
    commandTextChannel,
    setCommandTextChannel,
    commandAttributes,
    setCommandAttributes,
    routeFrames,
    routeDistanceMeters,
    routeDurationMs,
    routeAverageSpeed,
    routeMaxSpeed,
    routeSnap,
    playbackActive,
    setPlaybackActive,
    setPlaybackIndex,
    boundedPlaybackIndex,
    playbackProgress,
    playbackSpeed,
    setPlaybackSpeed,
    playbackSpeedKmh,
    playbackPoint,
    playbackHeading,
    routePathPoints,
    visibleGeofenceShapes,
    zoneDraft,
    setZoneDraft,
    zoneDrawingMode,
    setZoneDrawingMode,
    mapType,
    setMapType,
    clustersEnabled,
    setClustersEnabled,
    mapFocusMode,
    mapFitToken,
    hasMapData,
    backToFleet,
    openVehicle,
    focusMap,
    handleExport,
    handleOpenGeofenceManager,
    handleLoadSnapshot,
    handleLoadRoute,
    handleLoadEvents,
    zonesLoading,
    routeLoading,
    eventsLoading,
    snapshotLoading,
    deviceSaving,
    commandSending,
    zoneStudioOpen,
    editingGeofenceId,
    zoneFormName,
    setZoneFormName,
    zoneFormDescription,
    setZoneFormDescription,
    zoneFormType,
    zoneFormRadius,
    zoneFormPolylineDistance,
    setZoneFormPolylineDistance,
    handleOpenCreateZone,
    handleOpenEditZone,
    handleDeleteZone,
    handleToggleGeofenceLink,
    handleRefreshZones,
    handleZoneTypeChange,
    handleZoneRadiusChange,
    handleStartZoneDrawing,
    resetZoneStudio,
    handleSaveZone,
    handleLinkDevice,
    handleUnlinkDevice,
    handleSendCommand,
    setFrom,
    from,
    setTo,
    to,
    resetDetailState,
    fleetHealth,
  }
}
