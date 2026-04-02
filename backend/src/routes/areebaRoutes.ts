import express from 'express'
import routeNames from '../config/areebaRoutes.config'
import * as areebaController from '../controllers/areebaController'

const routes = express.Router()

routes.route(routeNames.createSession).post(areebaController.createSession)
routes.route(routeNames.verifyPayment).post(areebaController.verifyPayment)

export default routes
