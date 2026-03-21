const routes = {
  status: '/api/status',
  devices: '/api/devices',
  fleet: '/api/fleet',
  link: '/api/link/:carId',
  unlink: '/api/unlink/:carId',
  positions: '/api/positions/:carId',
  route: '/api/route/:carId',
  geofences: '/api/geofences/:carId',
  geofenceAlerts: '/api/geofence-alerts/:carId',
}

export default routes
