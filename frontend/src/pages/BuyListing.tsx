import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Chip } from '@mui/material'
import { ArrowBack, Call, DirectionsCar, Place } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import * as UserService from '@/services/UserService'
import * as PaymentService from '@/services/PaymentService'
import * as SaleListingService from '@/services/SaleListingService'
import NoMatch from '@/pages/NoMatch'

import '@/assets/css/buy.css'

const getLabel = (label: string, value: string | number) => (
  <div className="buy-detail-spec">
    <div className="buy-card-spec-label">{label}</div>
    <div className="buy-card-spec-value">{value}</div>
  </div>
)

const formatMileage = (value: number) => `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} km`

const BuyListing = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [result, setResult] = useState<bookcarsTypes.SaleListingDetailResult | null>()

  useEffect(() => {
    if (id) {
      void SaleListingService.getSaleListing(id).then(setResult)
    }
  }, [id])

  if (result === null) {
    return <NoMatch />
  }

  if (!result) {
    return (
      <Layout strict={false}>
        <div className="buy-page">
          <div className="buy-shell">
            <div className="buy-empty">
              <h3>Loading listing...</h3>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const { listing, similar } = result
  const language = UserService.getLanguage()
  const currency = PaymentService.getCurrency()

  return (
    <Layout strict={false}>
      <div className="buy-page">
        <div className="buy-shell">
          <Button
            startIcon={<ArrowBack />}
            variant="text"
            sx={{ color: '#fff', mb: 2 }}
            onClick={() => navigate('/buy')}
          >
            Back to listings
          </Button>

          <div className="buy-detail-layout">
            <div className="buy-detail-main">
              <div className="buy-detail-image" style={{ backgroundImage: `url('${listing.images[0] || ''}')` }} />
              <div className="buy-detail-content">
                <Chip
                  size="small"
                  label={listing.condition === bookcarsTypes.ListingCondition.New ? 'New' : 'Used'}
                  sx={{ bgcolor: '#2B190F', color: '#FFD3B1', mb: 1.5 }}
                />
                <h2 className="buy-detail-title">{listing.title}</h2>
                <div className="buy-detail-muted">{listing.brand} - {listing.model} - {listing.locationLabel || listing.city || listing.seller.location || ''}</div>
                <div className="buy-detail-price">{bookcarsHelper.formatPrice(listing.price, currency, language)}</div>

                <div className="buy-detail-spec-grid">
                  {getLabel('Year', listing.year)}
                  {getLabel('Mileage', formatMileage(listing.mileage))}
                  {getLabel('Transmission', listing.gearbox === bookcarsTypes.GearboxType.Automatic ? 'Automatic' : 'Manual')}
                  {getLabel('Drivetrain', listing.drivetrain.toUpperCase())}
                  {getLabel('Fuel Type', listing.fuelType)}
                  {getLabel('Source', listing.source)}
                  {getLabel('Color', listing.exteriorColor)}
                  {getLabel('Seller Type', listing.seller.type)}
                </div>

                {!!listing.description && (
                  <>
                    <h3>Description</h3>
                    <div className="buy-detail-muted" style={{ fontSize: 16, lineHeight: 1.8 }}>{listing.description}</div>
                  </>
                )}

                <div style={{ marginTop: 28 }}>
                  <h3>Features</h3>
                  {[
                    { title: 'Technology', values: listing.features.technology },
                    { title: 'Safety', values: listing.features.safety },
                    { title: 'Comfort & Convenience', values: listing.features.comfort },
                  ].map((group) => (
                    <div key={group.title} className="buy-feature-group">
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>{group.title}</div>
                      <div className="buy-feature-list">
                        {group.values.map((feature) => (
                          <div key={feature} className="buy-feature">{feature}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {similar.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <h3>Similarly Priced Cars</h3>
                    <div className="buy-similar-grid">
                      {similar.map((item) => (
                        <article key={item._id} className="buy-card" onClick={() => navigate(`/buy/${item._id}`)}>
                          <div className="buy-card-image" style={{ backgroundImage: `url('${item.images[0] || ''}')` }}>
                            <div className="buy-price-badge">
                              {bookcarsHelper.formatPrice(item.price, currency, language)}
                            </div>
                          </div>
                          <div className="buy-card-body">
                            <div className="buy-card-title" style={{ fontSize: 22 }}>{item.title}</div>
                            <div className="buy-card-subtitle">{item.locationLabel || item.city || item.seller.location || ''}</div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="buy-detail-side">
              <div className="buy-kicker">Seller</div>
              <h3 style={{ marginTop: 0 }}>{listing.seller.name}</h3>
              <div className="buy-detail-muted">{listing.seller.type === bookcarsTypes.ListingSellerType.Dealership ? 'Dealership' : 'Private seller'}</div>
              <div className="buy-detail-muted" style={{ marginTop: 8 }}>{listing.seller.location || listing.locationLabel || listing.city || ''}</div>

              <div className="buy-contact-actions">
                <Button fullWidth variant="contained" startIcon={<Call />} sx={{ bgcolor: '#C56622', '&:hover': { bgcolor: '#B25A1C' } }}>
                  Call Seller
                </Button>
              </div>

              <div className="buy-contact-actions">
                <Button fullWidth variant="outlined" startIcon={<Place />} sx={{ color: '#fff', borderColor: '#393939' }}>
                  Open in Maps
                </Button>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="buy-card-spec">
                  <div className="buy-card-spec-label">Listing Code</div>
                  <div className="buy-card-spec-value">{listing._id}</div>
                </div>
                <div className="buy-card-spec" style={{ marginTop: 12 }}>
                  <div className="buy-card-spec-label">Mode</div>
                  <div className="buy-card-spec-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DirectionsCar fontSize="small" />
                    Buy
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BuyListing
