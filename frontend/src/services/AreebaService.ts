import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

/**
 * Create an Areeba checkout session.
 *
 * @param {bookcarsTypes.CreateAreebaSessionPayload} payload
 * @returns {Promise<bookcarsTypes.AreebaSessionResult>}
 */
export const createSession = (payload: bookcarsTypes.CreateAreebaSessionPayload): Promise<bookcarsTypes.AreebaSessionResult> =>
  axiosInstance
    .post('/api/areeba/create-session', payload)
    .then((res) => res.data)

/**
 * Verify an Areeba payment.
 *
 * @param {bookcarsTypes.VerifyAreebaPaymentPayload} payload
 * @returns {Promise<number>}
 */
export const verifyPayment = (payload: bookcarsTypes.VerifyAreebaPaymentPayload): Promise<number> =>
  axiosInstance
    .post('/api/areeba/verify-payment', payload)
    .then((res) => res.status)
