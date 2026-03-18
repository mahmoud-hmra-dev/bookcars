import React from 'react'
import Layout from '@/components/Layout'
import { strings } from '@/lang/manual-documentation'

import '@/assets/css/documentation.css'

const ManualDocumentation = () => (
  <Layout strict>
    <div className="documentation">
      <h1>{strings.TITLE}</h1>
      <p>{strings.INTRO}</p>

      <section className="documentation-section">
        <h2>{strings.SYSTEM_OVERVIEW_TITLE}</h2>
        <ul>
          <li>{strings.SYSTEM_OVERVIEW_ITEM1}</li>
          <li>{strings.SYSTEM_OVERVIEW_ITEM2}</li>
          <li>{strings.SYSTEM_OVERVIEW_ITEM3}</li>
        </ul>
      </section>

      <section className="documentation-section">
        <h2>{strings.ROLES_TITLE}</h2>

        <h3>{strings.ADMIN_TITLE}</h3>
        <ul>
          <li>{strings.ADMIN_ITEM1}</li>
          <li>{strings.ADMIN_ITEM2}</li>
          <li>{strings.ADMIN_ITEM3}</li>
        </ul>

        <h3>{strings.SUPPLIER_TITLE}</h3>
        <ul>
          <li>{strings.SUPPLIER_ITEM1}</li>
          <li>{strings.SUPPLIER_ITEM2}</li>
          <li>{strings.SUPPLIER_ITEM3}</li>
        </ul>

        <h3>{strings.CUSTOMER_TITLE}</h3>
        <ul>
          <li>{strings.CUSTOMER_ITEM1}</li>
          <li>{strings.CUSTOMER_ITEM2}</li>
          <li>{strings.CUSTOMER_ITEM3}</li>
        </ul>

        <h3>{strings.GUEST_TITLE}</h3>
        <ul>
          <li>{strings.GUEST_ITEM1}</li>
          <li>{strings.GUEST_ITEM2}</li>
        </ul>
      </section>

      <section className="documentation-section">
        <h2>{strings.OPERATIONS_TITLE}</h2>
        <ol>
          <li>{strings.OPERATIONS_ITEM1}</li>
          <li>{strings.OPERATIONS_ITEM2}</li>
          <li>{strings.OPERATIONS_ITEM3}</li>
          <li>{strings.OPERATIONS_ITEM4}</li>
          <li>{strings.OPERATIONS_ITEM5}</li>
          <li>{strings.OPERATIONS_ITEM6}</li>
        </ol>
      </section>

      <section className="documentation-section">
        <h2>{strings.BEST_PRACTICES_TITLE}</h2>
        <ul>
          <li>{strings.BEST_PRACTICES_ITEM1}</li>
          <li>{strings.BEST_PRACTICES_ITEM2}</li>
          <li>{strings.BEST_PRACTICES_ITEM3}</li>
          <li>{strings.BEST_PRACTICES_ITEM4}</li>
        </ul>
      </section>
    </div>
  </Layout>
)

export default ManualDocumentation
