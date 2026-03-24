import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as AsyncStorage from '@/utils/AsyncStorage'
import { mockDealerships, mockSaleBrands, mockSaleListings } from '@/config/mockSaleMarketplace'

const SALE_FILTERS_STORAGE_KEY = 'bc-sale-filters'

const applyFilters = (
  listings: bookcarsTypes.SaleListing[],
  filters: bookcarsTypes.SaleListingFilter = {},
) => listings.filter((listing) => {
  const keyword = filters.keyword?.trim().toLowerCase()
  if (keyword) {
    const haystack = `${listing.title} ${listing.brand} ${listing.model} ${listing.city || ''} ${listing.seller.name}`.toLowerCase()
    if (!haystack.includes(keyword)) {
      return false
    }
  }

  const inList = <T>(values: T[] | undefined, value: T) => !values?.length || values.includes(value)
  if (!inList(filters.brands, listing.brand)) {
    return false
  }
  if (!inList(filters.categories, listing.category)) {
    return false
  }
  if (!inList(filters.fuelTypes, listing.fuelType)) {
    return false
  }
  if (!inList(filters.gearboxes, listing.gearbox)) {
    return false
  }
  if (!inList(filters.drivetrains, listing.drivetrain)) {
    return false
  }
  if (!inList(filters.conditions, listing.condition)) {
    return false
  }
  if (!inList(filters.sources, listing.source)) {
    return false
  }
  if (!inList(filters.colors, listing.exteriorColor)) {
    return false
  }
  if (!inList(filters.sellerTypes, listing.seller.type)) {
    return false
  }
  if (filters.dealershipIds?.length && !filters.dealershipIds.includes(listing.seller.supplierId || '')) {
    return false
  }
  if (typeof filters.minPrice === 'number' && listing.price < filters.minPrice) {
    return false
  }
  if (typeof filters.maxPrice === 'number' && listing.price > filters.maxPrice) {
    return false
  }
  if (typeof filters.minMileage === 'number' && listing.mileage < filters.minMileage) {
    return false
  }
  if (typeof filters.maxMileage === 'number' && listing.mileage > filters.maxMileage) {
    return false
  }
  if (typeof filters.minYear === 'number' && listing.year < filters.minYear) {
    return false
  }
  if (typeof filters.maxYear === 'number' && listing.year > filters.maxYear) {
    return false
  }

  return true
})

const sortListings = (listings: bookcarsTypes.SaleListing[]) => [...listings].sort((left, right) => {
  if (!!left.featured !== !!right.featured) {
    return left.featured ? -1 : 1
  }

  const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
  const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
  return rightTime - leftTime
})

export const getSaleListings = async (
  filters: bookcarsTypes.SaleListingFilter = {},
  page = 1,
  size = 20,
): Promise<bookcarsTypes.SaleListingSearchResult> => {
  try {
    const response = await axiosInstance.post<bookcarsTypes.SaleListingSearchResult>(
      `/api/sale-listings/${page}/${size}`,
      filters,
    )
    return response.data
  } catch {
    const filtered = sortListings(applyFilters(mockSaleListings, filters))
    const start = (page - 1) * size
    return {
      rows: filtered.slice(start, start + size),
      rowCount: filtered.length,
    }
  }
}

export const getSaleListing = async (id: string): Promise<bookcarsTypes.SaleListingDetailResult | null> => {
  try {
    const response = await axiosInstance.get<bookcarsTypes.SaleListingDetailResult>(`/api/sale-listing/${encodeURIComponent(id)}`)
    return response.data
  } catch {
    const listing = mockSaleListings.find((item) => item._id === id)
    if (!listing) {
      return null
    }

    const similar = sortListings(
      mockSaleListings.filter((item) => item._id !== id && item.category === listing.category),
    ).slice(0, 4)

    return { listing, similar }
  }
}

export const getDealerships = async (): Promise<bookcarsTypes.Dealership[]> => {
  try {
    const response = await axiosInstance.get<bookcarsTypes.Dealership[]>('/api/sale-dealerships')
    return response.data
  } catch {
    return mockDealerships
  }
}

export const getSaleBrands = async (): Promise<Array<{ name: string, count: number }>> => {
  try {
    const response = await axiosInstance.get<Array<{ name: string, count: number }>>('/api/sale-brands')
    return response.data
  } catch {
    return mockSaleBrands
  }
}

export const getStoredSaleFilters = async (): Promise<bookcarsTypes.SaleListingFilter> =>
  (await AsyncStorage.getObject<bookcarsTypes.SaleListingFilter>(SALE_FILTERS_STORAGE_KEY)) || {}

export const setStoredSaleFilters = async (filters: bookcarsTypes.SaleListingFilter) => {
  await AsyncStorage.storeObject(SALE_FILTERS_STORAGE_KEY, filters)
}

export const clearStoredSaleFilters = async () => {
  await AsyncStorage.removeItem(SALE_FILTERS_STORAGE_KEY)
}
