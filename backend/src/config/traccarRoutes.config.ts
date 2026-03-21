const routes = {
  status: '/api/status',
  devices: '/api/devices',
  fleet: '/api/fleet',
  geofenceCollection: '/api/geofences',
  geofenceEntity: '/api/geofences/entity/:geofenceId',
  geofenceLink: '/api/geofences/:carId/link/:geofenceId',
  geofenceUnlink: '/api/geofences/:carId/unlink/:geofenceId',
  link: '/api/link/:carId',
  unlink: '/api/unlink/:carId',
  positions: '/api/positions/:carId',
  commandTypes: '/api/commands/:carId/types',
  commandSend: '/api/commands/:carId/send',
  route: '/api/route/:carId',
  reports: '/api/reports/:carId',
  geofences: '/api/geofences/:carId',
  geofenceAlerts: '/api/geofence-alerts/:carId',
  eventCenter: '/api/events-center',
}

export default routes
