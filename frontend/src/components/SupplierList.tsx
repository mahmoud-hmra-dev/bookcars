import React, { useEffect, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'

import '@/assets/css/supplier-list.css'

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])

  useEffect(() => {
    const fetch = async () => {
      const _suppliers = await SupplierService.getAllSuppliers()
      setSuppliers(_suppliers)
    }

    fetch()
  }, [])

  return (
    <div className="supplier-list">
      {
        suppliers.map((supplier) => (
          <div key={supplier._id} className="supplier" title={supplier.fullName}>
            <div className="img">
              <img src={helper.supplierImageURL(supplier.avatar)} alt={supplier.fullName} />
            </div>
            <div className="name">{supplier.fullName}</div>
          </div>
        ))
      }
    </div>
  )
}

export default SupplierList
