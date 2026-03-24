import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, Typography } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import NoMatch from '@/pages/NoMatch'
import SaleListingForm from '@/components/SaleListingForm'
import * as helper from '@/utils/helper'
import * as SaleListingService from '@/services/SaleListingService'

const UpdateSaleListing = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [listing, setListing] = useState<bookcarsTypes.SaleListing | null>()
  const [submitting, setSubmitting] = useState(false)
  const listingId = searchParams.get('sl')

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  useEffect(() => {
    const load = async () => {
      if (!listingId) {
        setListing(null)
        return
      }

      try {
        const data = await SaleListingService.getSaleListing(listingId)
        setListing(data)
      } catch (err) {
        helper.error(err)
        setListing(null)
      }
    }

    void load()
  }, [listingId])

  const handleSubmit = async (payload: bookcarsTypes.CreateSaleListingPayload | bookcarsTypes.UpdateSaleListingPayload) => {
    try {
      setSubmitting(true)
      const status = await SaleListingService.update(payload as bookcarsTypes.UpdateSaleListingPayload)
      if (status === 200) {
        const refreshed = await SaleListingService.getSaleListing(listingId as string)
        setListing(refreshed)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!listingId) {
    return <NoMatch />
  }

  return (
    <Layout onLoad={onLoad} strict>
      {listing === undefined ? (
        <Card variant="outlined" sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
          <CardContent>
            <Typography color="text.secondary">Loading sale listing...</Typography>
          </CardContent>
        </Card>
      ) : listing === null ? (
        <NoMatch />
      ) : (
        <SaleListingForm
          user={user}
          initialValue={listing}
          submitting={submitting}
          onCancel={() => navigate('/sale-listings')}
          onSubmit={handleSubmit}
        />
      )}
    </Layout>
  )
}

export default UpdateSaleListing
