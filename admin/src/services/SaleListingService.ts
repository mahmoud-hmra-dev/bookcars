import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

export const create = (data: bookcarsTypes.CreateSaleListingPayload): Promise<bookcarsTypes.SaleListing> =>
  axiosInstance
    .post(
      '/api/create-sale-listing',
      data,
      { withCredentials: true },
    )
    .then((res) => res.data)

export const update = (data: bookcarsTypes.UpdateSaleListingPayload): Promise<number> =>
  axiosInstance
    .put(
      '/api/update-sale-listing',
      data,
      { withCredentials: true },
    )
    .then((res) => res.status)

export const deleteSaleListing = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-sale-listing/${encodeURIComponent(id)}`,
      { withCredentials: true },
    )
    .then((res) => res.status)

export const getSaleListing = (id: string): Promise<bookcarsTypes.SaleListing> =>
  axiosInstance
    .get(
      `/api/admin-sale-listing/${encodeURIComponent(id)}`,
      { withCredentials: true },
    )
    .then((res) => res.data)

export const getSaleListings = (
  keyword: string,
  data: bookcarsTypes.SaleListingFilter,
  page: number,
  size: number,
): Promise<bookcarsTypes.SaleListingSearchResult> =>
  axiosInstance
    .post(
      `/api/admin-sale-listings/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true },
    )
    .then((res) => res.data)
