import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'

type FormValues = {
  title: string
  brand: string
  model: string
  year: string
  price: string
  mileage: string
  gearbox: bookcarsTypes.GearboxType
  drivetrain: bookcarsTypes.DrivetrainType
  condition: bookcarsTypes.ListingCondition
  source: bookcarsTypes.ListingSource
  fuelType: bookcarsTypes.CarType
  category: bookcarsTypes.SaleCategory
  exteriorColor: string
  colorHex: string
  city: string
  locationLabel: string
  description: string
  images: string
  technology: string
  safety: string
  comfort: string
  featured: boolean
  published: boolean
  sellerType: bookcarsTypes.ListingSellerType
  supplierId: string
  sellerName: string
  phone: string
  whatsapp: string
  avatar: string
  sellerLocation: string
  badge: string
}

interface SaleListingFormProps {
  user?: bookcarsTypes.User
  initialValue?: bookcarsTypes.SaleListing
  submitting?: boolean
  onCancel?: () => void
  onSubmit: (payload: bookcarsTypes.CreateSaleListingPayload | bookcarsTypes.UpdateSaleListingPayload) => Promise<void> | void
}

const toMultiline = (values?: string[]) => (values || []).join('\n')
const parseMultiline = (value: string) => value
  .split(/\r?\n|,/)
  .map((item) => item.trim())
  .filter(Boolean)

const getInitialValues = (listing?: bookcarsTypes.SaleListing): FormValues => ({
  title: listing?.title || '',
  brand: listing?.brand || '',
  model: listing?.model || '',
  year: listing?.year?.toString() || '',
  price: listing?.price?.toString() || '',
  mileage: listing?.mileage?.toString() || '',
  gearbox: listing?.gearbox || bookcarsTypes.GearboxType.Automatic,
  drivetrain: listing?.drivetrain || bookcarsTypes.DrivetrainType.Fwd,
  condition: listing?.condition || bookcarsTypes.ListingCondition.Used,
  source: listing?.source || bookcarsTypes.ListingSource.Company,
  fuelType: listing?.fuelType || bookcarsTypes.CarType.Gasoline,
  category: listing?.category || bookcarsTypes.SaleCategory.Sedan,
  exteriorColor: listing?.exteriorColor || '',
  colorHex: listing?.colorHex || '',
  city: listing?.city || '',
  locationLabel: listing?.locationLabel || '',
  description: listing?.description || '',
  images: toMultiline(listing?.images),
  technology: toMultiline(listing?.features?.technology),
  safety: toMultiline(listing?.features?.safety),
  comfort: toMultiline(listing?.features?.comfort),
  featured: !!listing?.featured,
  published: typeof listing?.published === 'boolean' ? listing.published : true,
  sellerType: listing?.seller?.type || bookcarsTypes.ListingSellerType.Dealership,
  supplierId: listing?.seller?.supplierId || '',
  sellerName: listing?.seller?.name || '',
  phone: listing?.seller?.phone || '',
  whatsapp: listing?.seller?.whatsapp || '',
  avatar: listing?.seller?.avatar || '',
  sellerLocation: listing?.seller?.location || '',
  badge: listing?.seller?.badge || '',
})

const SaleListingForm = ({
  user,
  initialValue,
  submitting,
  onCancel,
  onSubmit,
}: SaleListingFormProps) => {
  const isAdmin = helper.admin(user)
  const [form, setForm] = useState<FormValues>(getInitialValues(initialValue))
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(getInitialValues(initialValue))
  }, [initialValue])

  useEffect(() => {
    const load = async () => {
      if (isAdmin) {
        const rows = await SupplierService.getAllSuppliers()
        setSuppliers(rows)
      }
    }

    void load()
  }, [isAdmin])

  useEffect(() => {
    if (user?.type === bookcarsTypes.UserType.Supplier) {
      setForm((prev) => ({
        ...prev,
        sellerType: bookcarsTypes.ListingSellerType.Dealership,
        supplierId: user._id || '',
        sellerName: user.fullName,
        phone: prev.phone || user.phone || '',
        avatar: prev.avatar || user.avatar || '',
        sellerLocation: prev.sellerLocation || user.location || '',
      }))
    }
  }, [user])

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier._id === form.supplierId),
    [suppliers, form.supplierId],
  )

  const setField = <T extends keyof FormValues>(key: T, value: FormValues[T]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.title.trim() || !form.brand.trim() || !form.model.trim()) {
      setError('Title, brand, and model are required.')
      return
    }

    if (!form.images.trim()) {
      setError('At least one image URL is required.')
      return
    }

    if (!form.year || Number.isNaN(Number(form.year)) || !form.price || Number.isNaN(Number(form.price)) || !form.mileage || Number.isNaN(Number(form.mileage))) {
      setError('Year, price, and mileage must be valid numeric values.')
      return
    }

    const sellerType = user?.type === bookcarsTypes.UserType.Supplier
      ? bookcarsTypes.ListingSellerType.Dealership
      : form.sellerType

    if (sellerType === bookcarsTypes.ListingSellerType.Dealership && !(form.supplierId || user?._id)) {
      setError('A supplier must be selected for dealership listings.')
      return
    }

    if (sellerType === bookcarsTypes.ListingSellerType.Private && !form.sellerName.trim()) {
      setError('Seller name is required for private listings.')
      return
    }

    const payload: bookcarsTypes.CreateSaleListingPayload = {
      title: form.title.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      price: Number(form.price),
      mileage: Number(form.mileage),
      gearbox: form.gearbox,
      drivetrain: form.drivetrain,
      condition: form.condition,
      source: form.source,
      fuelType: form.fuelType,
      category: form.category,
      exteriorColor: form.exteriorColor.trim(),
      colorHex: form.colorHex.trim() || undefined,
      city: form.city.trim() || undefined,
      locationLabel: form.locationLabel.trim() || undefined,
      description: form.description.trim() || undefined,
      images: parseMultiline(form.images),
      features: {
        technology: parseMultiline(form.technology),
        safety: parseMultiline(form.safety),
        comfort: parseMultiline(form.comfort),
      },
      featured: form.featured,
      published: form.published,
      seller: {
        type: sellerType,
        supplierId: sellerType === bookcarsTypes.ListingSellerType.Dealership ? (form.supplierId || user?._id) : undefined,
        name: sellerType === bookcarsTypes.ListingSellerType.Dealership
          ? selectedSupplier?.fullName || user?.fullName || form.sellerName.trim() || 'Dealer'
          : form.sellerName.trim(),
        phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        avatar: form.avatar.trim() || undefined,
        location: form.sellerLocation.trim() || undefined,
        badge: form.badge.trim() || undefined,
      },
    }

    if (initialValue?._id) {
      await onSubmit({ ...payload, _id: initialValue._id })
    } else {
      await onSubmit(payload)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            {initialValue ? 'Update Sale Listing' : 'Create Sale Listing'}
          </Typography>
          <Typography color="text.secondary">
            Manage the sale inventory from the admin panel with dealer or private seller context.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <TextField label="Title" value={form.title} onChange={(e) => setField('title', e.target.value)} required />
          <TextField label="Brand" value={form.brand} onChange={(e) => setField('brand', e.target.value)} required />
          <TextField label="Model" value={form.model} onChange={(e) => setField('model', e.target.value)} required />
          <TextField label="Year" type="number" value={form.year} onChange={(e) => setField('year', e.target.value)} required />
          <TextField label="Price" type="number" value={form.price} onChange={(e) => setField('price', e.target.value)} required />
          <TextField label="Mileage" type="number" value={form.mileage} onChange={(e) => setField('mileage', e.target.value)} required />
          <TextField label="Exterior Color" value={form.exteriorColor} onChange={(e) => setField('exteriorColor', e.target.value)} required />
          <TextField label="Color Hex" value={form.colorHex} onChange={(e) => setField('colorHex', e.target.value)} placeholder="#111111" />
          <TextField label="City" value={form.city} onChange={(e) => setField('city', e.target.value)} />
          <TextField label="Location Label" value={form.locationLabel} onChange={(e) => setField('locationLabel', e.target.value)} />

          <FormControl fullWidth>
            <InputLabel>Gearbox</InputLabel>
            <Select label="Gearbox" value={form.gearbox} onChange={(e) => setField('gearbox', e.target.value as bookcarsTypes.GearboxType)}>
              <MenuItem value={bookcarsTypes.GearboxType.Automatic}>Automatic</MenuItem>
              <MenuItem value={bookcarsTypes.GearboxType.Manual}>Manual</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Drivetrain</InputLabel>
            <Select label="Drivetrain" value={form.drivetrain} onChange={(e) => setField('drivetrain', e.target.value as bookcarsTypes.DrivetrainType)}>
              <MenuItem value={bookcarsTypes.DrivetrainType.Fwd}>FWD</MenuItem>
              <MenuItem value={bookcarsTypes.DrivetrainType.Rwd}>RWD</MenuItem>
              <MenuItem value={bookcarsTypes.DrivetrainType.Awd}>AWD</MenuItem>
              <MenuItem value={bookcarsTypes.DrivetrainType.FourWd}>4WD</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Condition</InputLabel>
            <Select label="Condition" value={form.condition} onChange={(e) => setField('condition', e.target.value as bookcarsTypes.ListingCondition)}>
              <MenuItem value={bookcarsTypes.ListingCondition.New}>New</MenuItem>
              <MenuItem value={bookcarsTypes.ListingCondition.Used}>Used</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Source</InputLabel>
            <Select label="Source" value={form.source} onChange={(e) => setField('source', e.target.value as bookcarsTypes.ListingSource)}>
              <MenuItem value={bookcarsTypes.ListingSource.Company}>Company</MenuItem>
              <MenuItem value={bookcarsTypes.ListingSource.Gcc}>GCC</MenuItem>
              <MenuItem value={bookcarsTypes.ListingSource.Imported}>Imported</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Fuel Type</InputLabel>
            <Select label="Fuel Type" value={form.fuelType} onChange={(e) => setField('fuelType', e.target.value as bookcarsTypes.CarType)}>
              <MenuItem value={bookcarsTypes.CarType.Gasoline}>Gasoline</MenuItem>
              <MenuItem value={bookcarsTypes.CarType.Diesel}>Diesel</MenuItem>
              <MenuItem value={bookcarsTypes.CarType.Hybrid}>Hybrid</MenuItem>
              <MenuItem value={bookcarsTypes.CarType.PlugInHybrid}>Plug-in Hybrid</MenuItem>
              <MenuItem value={bookcarsTypes.CarType.Electric}>Electric</MenuItem>
              <MenuItem value={bookcarsTypes.CarType.Unknown}>Unknown</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={form.category} onChange={(e) => setField('category', e.target.value as bookcarsTypes.SaleCategory)}>
              <MenuItem value={bookcarsTypes.SaleCategory.Sedan}>Sedan</MenuItem>
              <MenuItem value={bookcarsTypes.SaleCategory.Sports}>Sports</MenuItem>
              <MenuItem value={bookcarsTypes.SaleCategory.Suv}>SUV</MenuItem>
              <MenuItem value={bookcarsTypes.SaleCategory.Hatchback}>Hatchback</MenuItem>
              <MenuItem value={bookcarsTypes.SaleCategory.Coupe}>Coupe</MenuItem>
              <MenuItem value={bookcarsTypes.SaleCategory.Pickup}>Pickup</MenuItem>
              <MenuItem value={bookcarsTypes.SaleCategory.Van}>Van</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          multiline
          minRows={4}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          <TextField
            label="Images"
            value={form.images}
            onChange={(e) => setField('images', e.target.value)}
            multiline
            minRows={5}
            helperText="One image URL per line."
          />
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField label="Technology Features" value={form.technology} onChange={(e) => setField('technology', e.target.value)} multiline minRows={3} helperText="One feature per line." />
            <TextField label="Safety Features" value={form.safety} onChange={(e) => setField('safety', e.target.value)} multiline minRows={3} helperText="One feature per line." />
            <TextField label="Comfort Features" value={form.comfort} onChange={(e) => setField('comfort', e.target.value)} multiline minRows={3} helperText="One feature per line." />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: isAdmin ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }, gap: 2 }}>
          {isAdmin && (
            <FormControl fullWidth>
              <InputLabel>Seller Type</InputLabel>
              <Select label="Seller Type" value={form.sellerType} onChange={(e) => setField('sellerType', e.target.value as bookcarsTypes.ListingSellerType)}>
                <MenuItem value={bookcarsTypes.ListingSellerType.Dealership}>Dealership</MenuItem>
                <MenuItem value={bookcarsTypes.ListingSellerType.Private}>Private</MenuItem>
              </Select>
            </FormControl>
          )}

          {(form.sellerType === bookcarsTypes.ListingSellerType.Dealership || user?.type === bookcarsTypes.UserType.Supplier) && (
            <FormControl fullWidth>
              <InputLabel>Supplier</InputLabel>
              <Select
                label="Supplier"
                value={form.supplierId}
                onChange={(e) => setField('supplierId', e.target.value)}
                disabled={user?.type === bookcarsTypes.UserType.Supplier}
              >
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier._id} value={supplier._id}>{supplier.fullName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Seller Name"
            value={form.sellerName}
            onChange={(e) => setField('sellerName', e.target.value)}
            disabled={form.sellerType === bookcarsTypes.ListingSellerType.Dealership || user?.type === bookcarsTypes.UserType.Supplier}
          />

          <TextField label="Seller Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          <TextField label="Seller WhatsApp" value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} />
          <TextField label="Seller Avatar URL" value={form.avatar} onChange={(e) => setField('avatar', e.target.value)} />
          <TextField label="Seller Location" value={form.sellerLocation} onChange={(e) => setField('sellerLocation', e.target.value)} />
          <TextField label="Seller Badge" value={form.badge} onChange={(e) => setField('badge', e.target.value)} />
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <FormControlLabel control={<Switch checked={form.featured} onChange={(e) => setField('featured', e.target.checked)} />} label="Featured" />
          <FormControlLabel control={<Switch checked={form.published} onChange={(e) => setField('published', e.target.checked)} />} label="Published" />
        </Box>

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : initialValue ? 'Update Sale Listing' : 'Create Sale Listing'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outlined" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}

export default SaleListingForm
