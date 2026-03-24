import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import SaleListingForm from '@/components/SaleListingForm'
import * as helper from '@/utils/helper'
import * as SaleListingService from '@/services/SaleListingService'

const CreateSaleListing = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [submitting, setSubmitting] = useState(false)

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const handleSubmit = async (payload: bookcarsTypes.CreateSaleListingPayload | bookcarsTypes.UpdateSaleListingPayload) => {
    try {
      setSubmitting(true)
      const listing = await SaleListingService.create(payload as bookcarsTypes.CreateSaleListingPayload)
      navigate(`/update-sale-listing?sl=${listing._id}`)
    } catch (err) {
      helper.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <SaleListingForm
        user={user}
        submitting={submitting}
        onCancel={() => navigate('/sale-listings')}
        onSubmit={handleSubmit}
      />
    </Layout>
  )
}

export default CreateSaleListing
