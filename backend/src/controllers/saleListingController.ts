import { Request, Response } from 'express'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import User from '../models/User'
import SaleListing, { SaleListingDocument } from '../models/SaleListing'

const toSaleListing = (listing: SaleListingDocument & { _id: mongoose.Types.ObjectId }): bookcarsTypes.SaleListing => ({
  _id: listing._id.toString(),
  title: listing.title,
  brand: listing.brand,
  model: listing.model,
  year: listing.year,
  price: listing.price,
  mileage: listing.mileage,
  gearbox: listing.gearbox,
  drivetrain: listing.drivetrain,
  condition: listing.condition,
  source: listing.source,
  fuelType: listing.fuelType,
  category: listing.category,
  exteriorColor: listing.exteriorColor,
  colorHex: listing.colorHex,
  city: listing.city,
  locationLabel: listing.locationLabel,
  description: listing.description,
  images: Array.isArray(listing.images) ? listing.images : [],
  features: {
    technology: listing.features?.technology || [],
    safety: listing.features?.safety || [],
    comfort: listing.features?.comfort || [],
  },
  featured: listing.featured,
  published: listing.published,
  seller: {
    type: listing.seller.type,
    name: listing.seller.name,
    phone: listing.seller.phone,
    whatsapp: listing.seller.whatsapp,
    avatar: listing.seller.avatar,
    location: listing.seller.location,
    supplierId: listing.seller.supplierId?.toString(),
    badge: listing.seller.badge,
  },
  createdAt: listing.createdAt,
  updatedAt: listing.updatedAt,
})

const buildFilters = (
  payload: bookcarsTypes.SaleListingFilter = {},
  options: { published?: boolean, supplierId?: string } = {},
) => {
  const filters: Record<string, unknown> = {}

  if (typeof options.published === 'boolean') {
    filters.published = options.published
  } else if (typeof payload.published === 'boolean') {
    filters.published = payload.published
  }

  if (options.supplierId) {
    filters['seller.supplierId'] = new mongoose.Types.ObjectId(options.supplierId)
  }

  if (payload.keyword?.trim()) {
    const keyword = escapeStringRegexp(payload.keyword.trim())
    filters.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { brand: { $regex: keyword, $options: 'i' } },
      { model: { $regex: keyword, $options: 'i' } },
      { city: { $regex: keyword, $options: 'i' } },
      { 'seller.name': { $regex: keyword, $options: 'i' } },
    ]
  }

  if (payload.brands?.length) {
    filters.brand = { $in: payload.brands }
  }
  if (payload.categories?.length) {
    filters.category = { $in: payload.categories }
  }
  if (payload.fuelTypes?.length) {
    filters.fuelType = { $in: payload.fuelTypes }
  }
  if (payload.gearboxes?.length) {
    filters.gearbox = { $in: payload.gearboxes }
  }
  if (payload.drivetrains?.length) {
    filters.drivetrain = { $in: payload.drivetrains }
  }
  if (payload.conditions?.length) {
    filters.condition = { $in: payload.conditions }
  }
  if (payload.sources?.length) {
    filters.source = { $in: payload.sources }
  }
  if (payload.colors?.length) {
    filters.exteriorColor = { $in: payload.colors }
  }
  if (payload.sellerTypes?.length) {
    filters['seller.type'] = { $in: payload.sellerTypes }
  }
  if (!options.supplierId && payload.dealershipIds?.length) {
    filters['seller.supplierId'] = {
      $in: payload.dealershipIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    }
  }

  const numberRange = (key: string, min?: number, max?: number) => {
    const range: Record<string, number> = {}
    if (typeof min === 'number' && !Number.isNaN(min)) {
      range.$gte = min
    }
    if (typeof max === 'number' && !Number.isNaN(max)) {
      range.$lte = max
    }
    if (Object.keys(range).length > 0) {
      filters[key] = range
    }
  }

  numberRange('price', payload.minPrice, payload.maxPrice)
  numberRange('mileage', payload.minMileage, payload.maxMileage)
  numberRange('year', payload.minYear, payload.maxYear)

  return filters
}

const toObjectId = (value?: string) => {
  if (!value || !mongoose.isValidObjectId(value)) {
    return undefined
  }
  return new mongoose.Types.ObjectId(value)
}

const getSessionUser = async (req: Request) => {
  const sessionUserId = req.user?._id
  if (!sessionUserId || !mongoose.isValidObjectId(sessionUserId)) {
    return null
  }

  return User.findById(sessionUserId)
}

const buildSeller = async (
  seller: bookcarsTypes.SaleListingSeller,
  sessionUser: Awaited<ReturnType<typeof getSessionUser>>,
) => {
  const supplierId = toObjectId(seller.supplierId)

  if (sessionUser?.type === bookcarsTypes.UserType.Supplier) {
    return {
      type: bookcarsTypes.ListingSellerType.Dealership,
      name: sessionUser.fullName,
      phone: seller.phone?.trim() || sessionUser.phone,
      whatsapp: seller.whatsapp?.trim(),
      avatar: seller.avatar?.trim() || sessionUser.avatar,
      location: seller.location?.trim() || sessionUser.location,
      supplierId: new mongoose.Types.ObjectId(sessionUser._id),
      badge: seller.badge?.trim() || 'Dealer',
    }
  }

  if (seller.type === bookcarsTypes.ListingSellerType.Dealership) {
    if (!supplierId) {
      throw new Error('seller.supplierId is required for dealership listings')
    }

    const supplier = await User.findOne({ _id: supplierId, type: bookcarsTypes.UserType.Supplier })
    if (!supplier) {
      throw new Error('Supplier not found')
    }

    return {
      type: bookcarsTypes.ListingSellerType.Dealership,
      name: supplier.fullName,
      phone: seller.phone?.trim() || supplier.phone,
      whatsapp: seller.whatsapp?.trim(),
      avatar: seller.avatar?.trim() || supplier.avatar,
      location: seller.location?.trim() || supplier.location,
      supplierId,
      badge: seller.badge?.trim() || 'Dealer',
    }
  }

  return {
    type: bookcarsTypes.ListingSellerType.Private,
    name: seller.name.trim(),
    phone: seller.phone?.trim(),
    whatsapp: seller.whatsapp?.trim(),
    avatar: seller.avatar?.trim(),
    location: seller.location?.trim(),
    supplierId: undefined,
    badge: seller.badge?.trim() || 'Private',
  }
}

const buildSaleListingPayload = async (
  payload: bookcarsTypes.CreateSaleListingPayload,
  sessionUser: Awaited<ReturnType<typeof getSessionUser>>,
) => {
  const images = payload.images.map((item) => item.trim()).filter(Boolean)
  if (!Array.isArray(payload.images) || images.length === 0) {
    throw new Error('At least one image is required')
  }
  const seller = await buildSeller(payload.seller, sessionUser)

  return {
    title: payload.title.trim(),
    brand: payload.brand.trim(),
    model: payload.model.trim(),
    year: payload.year,
    price: payload.price,
    mileage: payload.mileage,
    gearbox: payload.gearbox,
    drivetrain: payload.drivetrain,
    condition: payload.condition,
    source: payload.source,
    fuelType: payload.fuelType,
    category: payload.category,
    exteriorColor: payload.exteriorColor.trim(),
    colorHex: payload.colorHex?.trim(),
    city: payload.city?.trim(),
    locationLabel: payload.locationLabel?.trim(),
    description: payload.description?.trim(),
    images,
    features: {
      technology: (payload.features?.technology || []).map((item) => item.trim()).filter(Boolean),
      safety: (payload.features?.safety || []).map((item) => item.trim()).filter(Boolean),
      comfort: (payload.features?.comfort || []).map((item) => item.trim()).filter(Boolean),
    },
    featured: !!payload.featured,
    published: typeof payload.published === 'boolean' ? payload.published : true,
    seller,
  }
}

const canManageListing = (sessionUser: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>, listing: SaleListingDocument & { _id: mongoose.Types.ObjectId }) => (
  sessionUser.type === bookcarsTypes.UserType.Admin
  || (sessionUser.type === bookcarsTypes.UserType.Supplier && listing.seller.supplierId?.toString() === sessionUser._id.toString())
)

export const createSaleListing = async (req: Request, res: Response) => {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      res.sendStatus(401)
      return
    }

    const payload = req.body as bookcarsTypes.CreateSaleListingPayload
    const listingPayload = await buildSaleListingPayload(payload, sessionUser)
    const listing = new SaleListing(listingPayload)
    await listing.save()

    res.json(toSaleListing(listing.toObject() as SaleListingDocument & { _id: mongoose.Types.ObjectId }))
  } catch (err) {
    logger.error(`[saleListing.createSaleListing] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const updateSaleListing = async (req: Request, res: Response) => {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      res.sendStatus(401)
      return
    }

    const payload = req.body as bookcarsTypes.UpdateSaleListingPayload
    if (!payload._id || !mongoose.isValidObjectId(payload._id)) {
      throw new Error('Invalid sale listing id')
    }

    const listing = await SaleListing.findById(payload._id)
    if (!listing) {
      res.sendStatus(204)
      return
    }

    if (!canManageListing(sessionUser, listing.toObject() as SaleListingDocument & { _id: mongoose.Types.ObjectId })) {
      res.sendStatus(403)
      return
    }

    const listingPayload = await buildSaleListingPayload(payload, sessionUser)
    Object.assign(listing, listingPayload)
    await listing.save()

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[saleListing.updateSaleListing] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const deleteSaleListing = async (req: Request, res: Response) => {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      res.sendStatus(401)
      return
    }

    const { id } = req.params
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new Error('Invalid sale listing id')
    }

    const listing = await SaleListing.findById(id)
    if (!listing) {
      res.sendStatus(204)
      return
    }

    if (!canManageListing(sessionUser, listing.toObject() as SaleListingDocument & { _id: mongoose.Types.ObjectId })) {
      res.sendStatus(403)
      return
    }

    await SaleListing.deleteOne({ _id: id })
    res.sendStatus(200)
  } catch (err) {
    logger.error(`[saleListing.deleteSaleListing] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getAdminSaleListing = async (req: Request, res: Response) => {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      res.sendStatus(401)
      return
    }

    const { id } = req.params
    if (!id || !mongoose.isValidObjectId(id)) {
      throw new Error('Invalid sale listing id')
    }

    const filters: Record<string, unknown> = { _id: id }
    if (sessionUser.type === bookcarsTypes.UserType.Supplier) {
      filters['seller.supplierId'] = new mongoose.Types.ObjectId(sessionUser._id)
    }

    const listing = await SaleListing.findOne(filters).lean()
    if (!listing) {
      res.sendStatus(204)
      return
    }

    res.json(toSaleListing(listing as SaleListingDocument & { _id: mongoose.Types.ObjectId }))
  } catch (err) {
    logger.error(`[saleListing.getAdminSaleListing] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getAdminSaleListings = async (req: Request, res: Response) => {
  try {
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) {
      res.sendStatus(401)
      return
    }

    const page = Math.max(1, Number.parseInt(req.params.page, 10) || 1)
    const size = Math.min(50, Math.max(1, Number.parseInt(req.params.size, 10) || 10))
    const keyword = String(req.query.s || '').trim()
    const payload = (req.body || {}) as bookcarsTypes.SaleListingFilter
    const filters = buildFilters(
      keyword ? { ...payload, keyword } : payload,
      { supplierId: sessionUser.type === bookcarsTypes.UserType.Supplier ? sessionUser._id.toString() : undefined },
    )

    const [rows, rowCount] = await Promise.all([
      SaleListing.find(filters)
        .sort({ featured: -1, createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      SaleListing.countDocuments(filters),
    ])

    const result: bookcarsTypes.SaleListingSearchResult = {
      rows: rows.map((row) => toSaleListing(row as SaleListingDocument & { _id: mongoose.Types.ObjectId })),
      rowCount,
    }

    res.json(result)
  } catch (err) {
    logger.error(`[saleListing.getAdminSaleListings] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getSaleListings = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number.parseInt(req.params.page, 10) || 1)
    const size = Math.min(50, Math.max(1, Number.parseInt(req.params.size, 10) || 10))
    const payload = (req.body || {}) as bookcarsTypes.SaleListingFilter
    const filters = buildFilters(payload, { published: true })

    const [rows, rowCount] = await Promise.all([
      SaleListing.find(filters)
        .sort({ featured: -1, createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size)
        .lean(),
      SaleListing.countDocuments(filters),
    ])

    const result: bookcarsTypes.SaleListingSearchResult = {
      rows: rows.map((row) => toSaleListing(row as SaleListingDocument & { _id: mongoose.Types.ObjectId })),
      rowCount,
    }

    res.json(result)
  } catch (err) {
    logger.error(`[saleListing.getSaleListings] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getSaleListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const listing = await SaleListing.findOne({ _id: id, published: true }).lean()

    if (!listing) {
      res.sendStatus(204)
      return
    }

    const similarRows = await SaleListing.find({
      _id: { $ne: listing._id },
      published: true,
      category: listing.category,
      price: {
        $gte: Math.max(0, listing.price - 10000),
        $lte: listing.price + 10000,
      },
    })
      .sort({ featured: -1, createdAt: -1 })
      .limit(4)
      .lean()

    const result: bookcarsTypes.SaleListingDetailResult = {
      listing: toSaleListing(listing as SaleListingDocument & { _id: mongoose.Types.ObjectId }),
      similar: similarRows.map((row) => toSaleListing(row as SaleListingDocument & { _id: mongoose.Types.ObjectId })),
    }

    res.json(result)
  } catch (err) {
    logger.error(`[saleListing.getSaleListing] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getDealerships = async (_req: Request, res: Response) => {
  try {
    const dealerships = await SaleListing.aggregate([
      {
        $match: {
          published: true,
          'seller.type': bookcarsTypes.ListingSellerType.Dealership,
        },
      },
      {
        $group: {
          _id: '$seller.supplierId',
          name: { $first: '$seller.name' },
          logo: { $first: '$seller.avatar' },
          location: { $first: '$seller.location' },
          city: { $first: '$city' },
          listingCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: { $ifNull: ['$_id', { $concat: ['dealership:', '$name'] }] },
          name: 1,
          logo: 1,
          location: 1,
          city: 1,
          listingCount: 1,
        },
      },
      { $sort: { listingCount: -1, name: 1 } },
    ])

    const rows: bookcarsTypes.Dealership[] = dealerships.map((item: any) => ({
      _id: String(item._id),
      name: item.name,
      logo: item.logo,
      location: item.location,
      city: item.city,
      listingCount: item.listingCount,
    }))

    res.json(rows)
  } catch (err) {
    logger.error(`[saleListing.getDealerships] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

export const getBrands = async (_req: Request, res: Response) => {
  try {
    const brands = await SaleListing.aggregate([
      { $match: { published: true } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 12 },
    ])

    res.json(brands.map((item: { _id: string, count: number }) => ({ name: item._id, count: item.count })))
  } catch (err) {
    logger.error(`[saleListing.getBrands] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
