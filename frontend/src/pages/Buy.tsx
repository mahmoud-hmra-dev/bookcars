import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import { DirectionsCar, Search as SearchIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import * as UserService from '@/services/UserService'
import * as PaymentService from '@/services/PaymentService'
import * as SaleListingService from '@/services/SaleListingService'

import '@/assets/css/buy.css'

const getCategoryLabel = (category: bookcarsTypes.SaleCategory) => {
  switch (category) {
    case bookcarsTypes.SaleCategory.Sedan:
      return 'Sedan'
    case bookcarsTypes.SaleCategory.Sports:
      return 'Sports'
    case bookcarsTypes.SaleCategory.Suv:
      return 'SUV'
    case bookcarsTypes.SaleCategory.Hatchback:
      return 'Hatchback'
    case bookcarsTypes.SaleCategory.Coupe:
      return 'Coupe'
    case bookcarsTypes.SaleCategory.Pickup:
      return 'Pickup'
    case bookcarsTypes.SaleCategory.Van:
      return 'Van'
    default:
      return category
  }
}

const formatMileage = (value: number) => `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} km`

const Buy = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [keyword, setKeyword] = useState(searchParams.get('q') || '')
  const [brand, setBrand] = useState(searchParams.get('brand') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [condition, setCondition] = useState(searchParams.get('condition') || '')
  const [dealer, setDealer] = useState(searchParams.get('dealer') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')
  const [rows, setRows] = useState<bookcarsTypes.SaleListing[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [brands, setBrands] = useState<Array<{ name: string, count: number }>>([])
  const [dealerships, setDealerships] = useState<bookcarsTypes.Dealership[]>([])

  const categories = useMemo(() => [
    bookcarsTypes.SaleCategory.Sedan,
    bookcarsTypes.SaleCategory.Sports,
    bookcarsTypes.SaleCategory.Suv,
    bookcarsTypes.SaleCategory.Hatchback,
    bookcarsTypes.SaleCategory.Coupe,
    bookcarsTypes.SaleCategory.Pickup,
    bookcarsTypes.SaleCategory.Van,
  ], [])

  const load = async () => {
    const filters: bookcarsTypes.SaleListingFilter = {
      ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      ...(brand ? { brands: [brand] } : {}),
      ...(category ? { categories: [category as bookcarsTypes.SaleCategory] } : {}),
      ...(condition ? { conditions: [condition as bookcarsTypes.ListingCondition] } : {}),
      ...(dealer ? { dealershipIds: [dealer] } : {}),
      ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
    }

    const [listingResult, brandRows, dealerRows] = await Promise.all([
      SaleListingService.getSaleListings(filters, 1, 24),
      SaleListingService.getSaleBrands(),
      SaleListingService.getDealerships(),
    ])

    setRows(listingResult.rows)
    setRowCount(listingResult.rowCount)
    setBrands(brandRows)
    setDealerships(dealerRows)
  }

  useEffect(() => {
    void load()
  }, [keyword, brand, category, condition, dealer, maxPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const params = new URLSearchParams()
    if (keyword.trim()) {
      params.set('q', keyword.trim())
    }
    if (brand) {
      params.set('brand', brand)
    }
    if (category) {
      params.set('category', category)
    }
    if (condition) {
      params.set('condition', condition)
    }
    if (dealer) {
      params.set('dealer', dealer)
    }
    if (maxPrice) {
      params.set('maxPrice', maxPrice)
    }
    setSearchParams(params)
  }, [keyword, brand, category, condition, dealer, maxPrice, setSearchParams])

  const language = UserService.getLanguage()
  const currency = PaymentService.getCurrency()

  return (
    <Layout strict={false}>
      <div className="buy-page">
        <div className="buy-shell">
          <div className="buy-hero">
            <div className="buy-hero-top">
              <div className="buy-hero-copy">
                <div className="buy-kicker">Buy Cars</div>
                <h1 className="buy-title">A marketplace for selling cars, not only renting them.</h1>
                <p className="buy-subtitle">
                  Browse dealer and private listings with a presentation closer to the mobile marketplace style:
                  dark surfaces, bold pricing, technical data, and direct seller context.
                </p>
                <div className="buy-pill-row">
                  <span className="buy-pill">Dealer inventory</span>
                  <span className="buy-pill">Private sellers</span>
                  <span className="buy-pill">Rich specs</span>
                  <span className="buy-pill">Marketplace filters</span>
                </div>
              </div>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button variant="contained" size="large" sx={{ bgcolor: '#C56622', '&:hover': { bgcolor: '#B25A1C' } }} onClick={() => navigate('/')}>
                  Rent Instead
                </Button>
              </Box>
            </div>
          </div>

          <div className="buy-grid">
            <aside className="buy-sidebar">
              <div className="buy-filter-group">
                <h3>Search</h3>
                <TextField
                  fullWidth
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Brand, model, seller..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>

              <div className="buy-filter-group">
                <h3>Brand</h3>
                <div className="buy-chip-row">
                  {brands.map((item) => (
                    <div
                      key={item.name}
                      className={`buy-chip${brand === item.name ? ' active' : ''}`}
                      onClick={() => setBrand((prev) => (prev === item.name ? '' : item.name))}
                      onKeyDown={() => undefined}
                      role="button"
                      tabIndex={0}
                    >
                      {item.name} ({item.count})
                    </div>
                  ))}
                </div>
              </div>

              <div className="buy-filter-group">
                <h3>Category</h3>
                <div className="buy-chip-row">
                  {categories.map((item) => (
                    <div
                      key={item}
                      className={`buy-chip${category === item ? ' active' : ''}`}
                      onClick={() => setCategory((prev) => (prev === item ? '' : item))}
                      onKeyDown={() => undefined}
                      role="button"
                      tabIndex={0}
                    >
                      {getCategoryLabel(item)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="buy-filter-group">
                <h3>Condition</h3>
                <FormControl fullWidth>
                  <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value={bookcarsTypes.ListingCondition.New}>New</MenuItem>
                    <MenuItem value={bookcarsTypes.ListingCondition.Used}>Used</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="buy-filter-group">
                <h3>Dealership</h3>
                <FormControl fullWidth>
                  <Select value={dealer} onChange={(e) => setDealer(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {dealerships.map((item) => (
                      <MenuItem key={item._id} value={item._id}>{item.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div className="buy-filter-group">
                <h3>Max Price</h3>
                <TextField
                  fullWidth
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Any price"
                />
              </div>

              <div className="buy-filter-actions">
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ bgcolor: '#C56622', '&:hover': { bgcolor: '#B25A1C' } }}
                  onClick={() => void load()}
                >
                  Apply Filters
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ color: '#f5f5f5', borderColor: '#3A3A3A' }}
                  onClick={() => {
                    setKeyword('')
                    setBrand('')
                    setCategory('')
                    setCondition('')
                    setDealer('')
                    setMaxPrice('')
                  }}
                >
                  Clear
                </Button>
              </div>
            </aside>

            <section className="buy-results">
              <div className="buy-results-header">
                <div>
                  <h2 style={{ margin: 0 }}>Cars for Sale</h2>
                  <div className="buy-detail-muted">{rowCount} listing(s) available</div>
                </div>
                <Chip icon={<DirectionsCar />} label="Buy mode" sx={{ color: '#fff', bgcolor: '#2B190F' }} />
              </div>

              {rows.length > 0 ? (
                <div className="buy-results-grid">
                  {rows.map((listing) => (
                    <article key={listing._id} className="buy-card" onClick={() => navigate(`/buy/${listing._id}`)}>
                      <div className="buy-card-image" style={{ backgroundImage: `url('${listing.images[0] || ''}')` }}>
                        <div className="buy-price-badge">
                          {bookcarsHelper.formatPrice(listing.price, currency, language)}
                        </div>
                      </div>

                      <div className="buy-card-body">
                        <div className="buy-card-top">
                          <div>
                            <div className="buy-card-title">{listing.title}</div>
                            <div className="buy-card-subtitle">{listing.brand} - {listing.locationLabel || listing.city || listing.seller.location || ''}</div>
                          </div>
                          <Chip
                            size="small"
                            label={listing.condition === bookcarsTypes.ListingCondition.New ? 'New' : 'Used'}
                            sx={{ bgcolor: '#23160E', color: '#FFD3B1' }}
                          />
                        </div>

                        <div className="buy-card-specs">
                          <div className="buy-card-spec">
                            <div className="buy-card-spec-label">Year</div>
                            <div className="buy-card-spec-value">{listing.year}</div>
                          </div>
                          <div className="buy-card-spec">
                            <div className="buy-card-spec-label">Mileage</div>
                            <div className="buy-card-spec-value">{formatMileage(listing.mileage)}</div>
                          </div>
                          <div className="buy-card-spec">
                            <div className="buy-card-spec-label">Transmission</div>
                            <div className="buy-card-spec-value">{listing.gearbox === bookcarsTypes.GearboxType.Automatic ? 'Automatic' : 'Manual'}</div>
                          </div>
                          <div className="buy-card-spec">
                            <div className="buy-card-spec-label">Source</div>
                            <div className="buy-card-spec-value">{listing.source.toUpperCase()}</div>
                          </div>
                        </div>

                        <div className="buy-card-footer">
                          <div>
                            <div className="buy-seller-name">{listing.seller.name}</div>
                            <div className="buy-card-meta">{listing.seller.type === bookcarsTypes.ListingSellerType.Dealership ? 'Dealership' : 'Private seller'}</div>
                          </div>
                          <Button variant="text" sx={{ color: '#D68A4D' }}>View Details</Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="buy-empty">
                  <h3>No sale listings matched these filters.</h3>
                  <p>Change the selected brand, category, dealership, or price cap and try again.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Buy
