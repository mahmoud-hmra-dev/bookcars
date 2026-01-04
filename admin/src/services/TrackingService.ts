import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

export const getCarTracking = (carId: string): Promise<bookcarsTypes.CarTrackingResponse> =>
  axiosInstance
    .get(`/api/admin/cars/${encodeURIComponent(carId)}/tracking`, { withCredentials: true })
    .then((res) => res.data)

export const getFleetTracking = (): Promise<bookcarsTypes.FleetTrackingResponse> =>
  axiosInstance
    .get('/api/admin/fleet/tracking', { withCredentials: true })
    .then((res) => res.data)
