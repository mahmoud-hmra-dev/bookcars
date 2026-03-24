import * as bookcarsTypes from ':bookcars-types'
import * as PaymentService from '@/services/PaymentService'
import axiosInstance from './axiosInstance'
import { mockDealerships, mockSaleBrands, mockSaleListings } from '@/config/mockSaleMarketplace'

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

  const inList = <T,>(values: T[] | undefined, value: T) => !values?.length || values.includes(value)

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

const convertListing = async (listing: bookcarsTypes.SaleListing): Promise<bookcarsTypes.SaleListing> => ({
  ...listing,
  price: await PaymentService.convertPrice(listing.price),
})

const convertRows = async (rows: bookcarsTypes.SaleListing[]) => Promise.all(rows.map(convertListing))

export const getSaleListings = async (
  filters: bookcarsTypes.SaleListingFilter = {},
  page = 1,
  size = 12,
): Promise<bookcarsTypes.SaleListingSearchResult> => {
  try {
    const response = await axiosInstance.post<bookcarsTypes.SaleListingSearchResult>(
      `/api/sale-listings/${page}/${size}`,
      filters,
    )

    return {
      rowCount: response.data.rowCount,
      rows: await convertRows(response.data.rows),
    }
  } catch {
    const filtered = sortListings(applyFilters(mockSaleListings, filters))
    const start = (page - 1) * size
    const rows = filtered.slice(start, start + size)

    return {
      rowCount: filtered.length,
      rows: await convertRows(rows),
    }
  }
}

export const getSaleListing = async (id: string): Promise<bookcarsTypes.SaleListingDetailResult | null> => {
  try {
    const response = await axiosInstance.get<bookcarsTypes.SaleListingDetailResult>(`/api/sale-listing/${encodeURIComponent(id)}`)
    return {
      listing: await convertListing(response.data.listing),
      similar: await convertRows(response.data.similar),
    }
  } catch {
    const listing = mockSaleListings.find((item) => item._id === id)
    if (!listing) {
      return null
    }

    const similar = sortListings(
      mockSaleListings.filter((item) => item._id !== id && item.category === listing.category),
    ).slice(0, 3)

    return {
      listing: await convertListing(listing),
      similar: await convertRows(similar),
    }
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
