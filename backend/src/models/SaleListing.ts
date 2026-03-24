import { Schema, Types, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'

interface SaleListingSellerDocument {
  type: bookcarsTypes.ListingSellerType
  name: string
  phone?: string
  whatsapp?: string
  avatar?: string
  location?: string
  supplierId?: Types.ObjectId
  badge?: string
}

export interface SaleListingDocument {
  title: string
  brand: string
  model: string
  year: number
  price: number
  mileage: number
  gearbox: bookcarsTypes.GearboxType
  drivetrain: bookcarsTypes.DrivetrainType
  condition: bookcarsTypes.ListingCondition
  source: bookcarsTypes.ListingSource
  fuelType: bookcarsTypes.CarType
  category: bookcarsTypes.SaleCategory
  exteriorColor: string
  colorHex?: string
  city?: string
  locationLabel?: string
  description?: string
  images: string[]
  features: bookcarsTypes.SaleListingFeatureGroups
  featured?: boolean
  published?: boolean
  seller: SaleListingSellerDocument
  createdAt?: Date
  updatedAt?: Date
}

const saleListingSchema = new Schema<SaleListingDocument>(
  {
    title: {
      type: String,
      required: [true, "can't be blank"],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      required: [true, "can't be blank"],
      trim: true,
      index: true,
    },
    model: {
      type: String,
      required: [true, "can't be blank"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "can't be blank"],
      min: 1900,
    },
    price: {
      type: Number,
      required: [true, "can't be blank"],
      min: 0,
      index: true,
    },
    mileage: {
      type: Number,
      required: [true, "can't be blank"],
      min: 0,
      index: true,
    },
    gearbox: {
      type: String,
      enum: [bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual],
      required: [true, "can't be blank"],
    },
    drivetrain: {
      type: String,
      enum: [
        bookcarsTypes.DrivetrainType.Fwd,
        bookcarsTypes.DrivetrainType.Rwd,
        bookcarsTypes.DrivetrainType.Awd,
        bookcarsTypes.DrivetrainType.FourWd,
      ],
      required: [true, "can't be blank"],
    },
    condition: {
      type: String,
      enum: [bookcarsTypes.ListingCondition.New, bookcarsTypes.ListingCondition.Used],
      required: [true, "can't be blank"],
    },
    source: {
      type: String,
      enum: [
        bookcarsTypes.ListingSource.Gcc,
        bookcarsTypes.ListingSource.Company,
        bookcarsTypes.ListingSource.Imported,
      ],
      required: [true, "can't be blank"],
    },
    fuelType: {
      type: String,
      enum: [
        bookcarsTypes.CarType.Diesel,
        bookcarsTypes.CarType.Gasoline,
        bookcarsTypes.CarType.Electric,
        bookcarsTypes.CarType.Hybrid,
        bookcarsTypes.CarType.PlugInHybrid,
        bookcarsTypes.CarType.Unknown,
      ],
      required: [true, "can't be blank"],
    },
    category: {
      type: String,
      enum: [
        bookcarsTypes.SaleCategory.Sedan,
        bookcarsTypes.SaleCategory.Sports,
        bookcarsTypes.SaleCategory.Suv,
        bookcarsTypes.SaleCategory.Hatchback,
        bookcarsTypes.SaleCategory.Coupe,
        bookcarsTypes.SaleCategory.Pickup,
        bookcarsTypes.SaleCategory.Van,
      ],
      required: [true, "can't be blank"],
    },
    exteriorColor: {
      type: String,
      trim: true,
      required: [true, "can't be blank"],
    },
    colorHex: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      index: true,
    },
    locationLabel: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      validate: (value: string[]) => Array.isArray(value) && value.length > 0,
      default: [],
    },
    features: {
      technology: {
        type: [String],
        default: [],
      },
      safety: {
        type: [String],
        default: [],
      },
      comfort: {
        type: [String],
        default: [],
      },
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    published: {
      type: Boolean,
      default: true,
      index: true,
    },
    seller: {
      type: {
        type: String,
        enum: [bookcarsTypes.ListingSellerType.Dealership, bookcarsTypes.ListingSellerType.Private],
        required: [true, "can't be blank"],
      },
      name: {
        type: String,
        trim: true,
        required: [true, "can't be blank"],
      },
      phone: {
        type: String,
        trim: true,
      },
      whatsapp: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
        trim: true,
      },
      location: {
        type: String,
        trim: true,
      },
      supplierId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      badge: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'SaleListing',
  },
)

saleListingSchema.index({ published: 1, featured: -1, createdAt: -1 })
saleListingSchema.index({ brand: 1, category: 1, condition: 1, price: 1 })
saleListingSchema.index({ year: -1, mileage: 1 })
saleListingSchema.index({ 'seller.type': 1, 'seller.supplierId': 1 })
saleListingSchema.index(
  { title: 'text', brand: 'text', model: 'text', 'seller.name': 'text', city: 'text' },
  {
    default_language: 'none',
    language_override: '_none',
    background: true,
  },
)

const SaleListing = model<SaleListingDocument>('SaleListing', saleListingSchema)

export default SaleListing
