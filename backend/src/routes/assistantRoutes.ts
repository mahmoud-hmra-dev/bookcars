import express from 'express'
import routeNames from '../config/assistantRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as assistantController from '../controllers/assistantController'

const routes = express.Router()

routes.route(routeNames.message).post(authJwt.verifyToken, authJwt.authAdmin, assistantController.message)

export default routes
