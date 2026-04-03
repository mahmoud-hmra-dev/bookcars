import express from 'express'
import routeNames from '../config/stripeRoutes.config'
import { paymentLimiter } from '../middlewares/rateLimiter'
import * as stripeController from '../controllers/stripeController'

const routes = express.Router()

routes.route(routeNames.createCheckoutSession).post(paymentLimiter, stripeController.createCheckoutSession)
routes.route(routeNames.checkCheckoutSession).post(paymentLimiter, stripeController.checkCheckoutSession)
routes.route(routeNames.createPaymentIntent).post(paymentLimiter, stripeController.createPaymentIntent)

export default routes
