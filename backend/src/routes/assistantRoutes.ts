import express from 'express'
import multer from 'multer'
import routeNames from '../config/assistantRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as assistantController from '../controllers/assistantController'

const routes = express.Router()

const assistantVoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype?.startsWith('audio/')) {
      callback(null, true)
      return
    }

    callback(new Error('Only audio uploads are allowed.'))
  },
})

routes.route(routeNames.message).post(authJwt.verifyToken, authJwt.authAdmin, assistantController.message)
routes.route(routeNames.voiceMessage).post(
  authJwt.verifyToken,
  authJwt.authAdmin,
  assistantVoiceUpload.single('audio'),
  assistantController.voiceMessage,
)

export default routes
