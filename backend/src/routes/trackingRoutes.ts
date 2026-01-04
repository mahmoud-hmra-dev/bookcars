import express from 'express'
import routeNames from '../config/trackingRoutes.config'
import adminGuard from '../middlewares/adminGuard'
import * as trackingController from '../controllers/trackingController'

const routes = express.Router()

routes.route(routeNames.getCarTracking).get(adminGuard, trackingController.getCarTracking)
routes.route(routeNames.getFleetTracking).get(adminGuard, trackingController.getFleetTracking)

export default routes
