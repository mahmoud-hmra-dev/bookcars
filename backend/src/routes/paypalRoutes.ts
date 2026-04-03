import express from 'express'
import routeNames from '../config/paypalRoutes.config'
import { paymentLimiter } from '../middlewares/rateLimiter'
import * as paypalController from '../controllers/paypalController'

const routes = express.Router()

routes.route(routeNames.createPayPalOrder).post(paymentLimiter, paypalController.createPayPalOrder)
routes.route(routeNames.checkPayPalOrder).post(paymentLimiter, paypalController.checkPayPalOrder)

export default routes
