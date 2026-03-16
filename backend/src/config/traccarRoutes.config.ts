const routes = {
  status: '/api/traccar/status',
  devices: '/api/traccar/devices',
  link: '/api/traccar/link/:carId',
  unlink: '/api/traccar/unlink/:carId',
  positions: '/api/traccar/positions/:carId',
  route: '/api/traccar/route/:carId',
  geofences: '/api/traccar/geofences/:carId',
  geofenceAlerts: '/api/traccar/geofence-alerts/:carId',
}

export default routes
