import express from 'express'
import authJwt from '../middlewares/authJwt'
import * as seedController from '../controllers/seedController'

const routes = express.Router()

routes.route('/api/seed-lebanon').post(authJwt.verifyToken, authJwt.authAdmin, seedController.seedLebanon)

export default routes
