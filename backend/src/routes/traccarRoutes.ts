import express from 'express'
import authJwt from '../middlewares/authJwt'
import routeNames from '../config/traccarRoutes.config'
import * as traccarController from '../controllers/traccarController'

const routes = express.Router()

routes.route(routeNames.status).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getIntegrationStatus)
routes.route(routeNames.devices).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getDevices)
routes.route(routeNames.link).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.linkDevice)
routes.route(routeNames.unlink).post(authJwt.verifyToken, authJwt.authAdmin, traccarController.unlinkDevice)
routes.route(routeNames.positions).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getCurrentPositions)
routes.route(routeNames.route).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getRouteHistory)
routes.route(routeNames.geofences).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGeofences)
routes.route(routeNames.geofenceAlerts).get(authJwt.verifyToken, authJwt.authAdmin, traccarController.getGeofenceAlerts)

export default routes
