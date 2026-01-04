import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as authHelper from '../utils/authHelper'
import * as helper from '../utils/helper'
import * as env from '../config/env.config'
import * as logger from '../utils/logger'
import User from '../models/User'

/**
 * Ensure the requester is an authenticated admin.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const adminGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined

    if (authHelper.isAdmin(req)) {
      token = req.signedCookies[env.ADMIN_AUTH_COOKIE_NAME] as string
    }

    if (!token) {
      token = req.headers[env.X_ACCESS_TOKEN] as string
    }

    if (!token) {
      res.status(403).send({ message: 'Admin token required' })
      return
    }

    const sessionData = await authHelper.decryptJWT(token)
    if (!sessionData?.id || !helper.isValidObjectId(sessionData.id)) {
      res.status(401).send({ message: 'Unauthorized' })
      return
    }

    const admin = await User.findOne({
      _id: new mongoose.Types.ObjectId(sessionData.id),
      type: bookcarsTypes.UserType.Admin,
      blacklisted: { $ne: true },
    })

    if (!admin) {
      res.status(403).send({ message: 'Forbidden' })
      return
    }

    res.locals.admin = {
      id: admin._id.toString(),
      language: admin.language,
    }

    next()
  } catch (err) {
    logger.error('[adminGuard] Unauthorized request', err)
    res.status(401).send({ message: 'Unauthorized' })
  }
}

export default adminGuard
