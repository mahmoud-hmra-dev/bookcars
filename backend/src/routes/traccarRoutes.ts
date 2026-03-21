import express from 'express'
import authJwt from '../middlewares/authJwt'
import routeNames from '../config/traccarRoutes.config'
import * as traccarController from '../controllers/traccarController'

const routes = express.Router()

routes.route(routeNames.status).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getIntegrationStatus)
routes.route(routeNames.devices).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getDevices)
routes.route(routeNames.fleet).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getFleetOverview)
routes.route(routeNames.geofenceCollection)
  .get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getAllGeofences)
  .post(authJwt.verifyToken, authJwt.authAdmin, traccarController.createGeofence)
routes.route(routeNames.geofenceEntity)
  .put(authJwt.verifyToken, authJwt.authAdmin, traccarController.updateGeofence)
routes.route(routeNames.geofenceLink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.linkGeofence)
routes.route(routeNames.geofenceUnlink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.unlinkGeofence)
routes.route(routeNames.link).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.linkDevice)
routes.route(routeNames.unlink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.unlinkDevice)
routes.route(routeNames.positions).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getCurrentPositions)
routes.route(routeNames.route).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getRouteHistory)
routes.route(routeNames.geofences).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGeofences)
routes.route(routeNames.geofenceAlerts).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGeofenceAlerts)

export default routes
