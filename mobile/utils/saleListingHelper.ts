import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

export const saleCategories = [
  bookcarsTypes.SaleCategory.Sedan,
  bookcarsTypes.SaleCategory.Sports,
  bookcarsTypes.SaleCategory.Suv,
  bookcarsTypes.SaleCategory.Hatchback,
  bookcarsTypes.SaleCategory.Coupe,
  bookcarsTypes.SaleCategory.Pickup,
]

export const fuelTypeOptions = [
  bookcarsTypes.CarType.Gasoline,
  bookcarsTypes.CarType.Diesel,
  bookcarsTypes.CarType.Hybrid,
  bookcarsTypes.CarType.Electric,
]

export const colorOptions = [
  { label: 'White', value: 'White', hex: '#F4F4F4' },
  { label: 'Black', value: 'Black', hex: '#111111' },
  { label: 'Gray', value: 'Gray', hex: '#8A8A8A' },
  { label: 'Silver', value: 'Silver', hex: '#CBCBCB' },
  { label: 'Blue', value: 'Blue', hex: '#244B93' },
  { label: 'Red', value: 'Red', hex: '#B32B2B' },
]

export const getSaleCategoryLabel = (category: bookcarsTypes.SaleCategory) => {
  switch (category) {
    case bookcarsTypes.SaleCategory.Sedan: return 'Sedan'
    case bookcarsTypes.SaleCategory.Sports: return 'Sports'
    case bookcarsTypes.SaleCategory.Suv: return 'SUV'
    case bookcarsTypes.SaleCategory.Hatchback: return 'Hatchback'
    case bookcarsTypes.SaleCategory.Coupe: return 'Coupe'
    case bookcarsTypes.SaleCategory.Pickup: return 'Pickup'
    case bookcarsTypes.SaleCategory.Van: return 'Van'
    default: return category
  }
}

export const getConditionLabel = (condition: bookcarsTypes.ListingCondition) => (
  condition === bookcarsTypes.ListingCondition.New ? 'New' : 'Used'
)

export const getSourceLabel = (source: bookcarsTypes.ListingSource) => {
  switch (source) {
    case bookcarsTypes.ListingSource.Gcc: return 'GCC'
    case bookcarsTypes.ListingSource.Company: return 'Company'
    case bookcarsTypes.ListingSource.Imported: return 'Imported'
    default: return source
  }
}

export const getFuelTypeLabel = (fuelType: bookcarsTypes.CarType) => {
  switch (fuelType) {
    case bookcarsTypes.CarType.Gasoline: return 'Benzine'
    case bookcarsTypes.CarType.Diesel: return 'Diesel'
    case bookcarsTypes.CarType.Hybrid: return 'Hybrid'
    case bookcarsTypes.CarType.Electric: return 'Electric'
    default: return bookcarsHelper.capitalize(fuelType)
  }
}

export const getDrivetrainLabel = (drivetrain: bookcarsTypes.DrivetrainType) => {
  switch (drivetrain) {
    case bookcarsTypes.DrivetrainType.Fwd: return 'FWD'
    case bookcarsTypes.DrivetrainType.Rwd: return 'RWD'
    case bookcarsTypes.DrivetrainType.Awd: return 'AWD'
    case bookcarsTypes.DrivetrainType.FourWd: return '4WD'
    default: return drivetrain
  }
}

export const formatSalePrice = (price: number) => `$${bookcarsHelper.formatNumber(price, 'en')}`

export const formatSaleMileage = (mileage: number) => (
  mileage >= 1000 ? `${Math.round(mileage / 1000)}k` : `${mileage}`
)
