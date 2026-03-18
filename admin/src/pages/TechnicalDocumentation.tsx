import React from 'react'
import Layout from '@/components/Layout'
import { strings } from '@/lang/technical-documentation'

import '@/assets/css/documentation.css'

const TechnicalDocumentation = () => (
  <Layout strict admin>
    <div className="documentation">
      <h1>{strings.TITLE}</h1>
      <p>{strings.INTRO}</p>

      <section className="documentation-section">
        <h2>{strings.ARCHITECTURE_TITLE}</h2>
        <ul>
          <li>{strings.ARCHITECTURE_ITEM1}</li>
          <li>{strings.ARCHITECTURE_ITEM2}</li>
          <li>{strings.ARCHITECTURE_ITEM3}</li>
          <li>{strings.ARCHITECTURE_ITEM4}</li>
        </ul>
      </section>

      <section className="documentation-section">
        <h2>{strings.MODULES_TITLE}</h2>
        <ul>
          <li>{strings.MODULES_ITEM1}</li>
          <li>{strings.MODULES_ITEM2}</li>
          <li>{strings.MODULES_ITEM3}</li>
          <li>{strings.MODULES_ITEM4}</li>
        </ul>
      </section>

      <section className="documentation-section">
        <h2>{strings.DATA_TITLE}</h2>
        <ul>
          <li>{strings.DATA_ITEM1}</li>
          <li>{strings.DATA_ITEM2}</li>
          <li>{strings.DATA_ITEM3}</li>
        </ul>
      </section>

      <section className="documentation-section">
        <h2>{strings.SECURITY_TITLE}</h2>
        <ul>
          <li>{strings.SECURITY_ITEM1}</li>
          <li>{strings.SECURITY_ITEM2}</li>
          <li>{strings.SECURITY_ITEM3}</li>
          <li>{strings.SECURITY_ITEM4}</li>
        </ul>
      </section>

      <section className="documentation-section">
        <h2>{strings.OPERATIONS_TITLE}</h2>
        <ol>
          <li>{strings.OPERATIONS_ITEM1}</li>
          <li>{strings.OPERATIONS_ITEM2}</li>
          <li>{strings.OPERATIONS_ITEM3}</li>
          <li>{strings.OPERATIONS_ITEM4}</li>
        </ol>
      </section>

      <section className="documentation-section">
        <h2>{strings.TROUBLESHOOTING_TITLE}</h2>
        <ul>
          <li>{strings.TROUBLESHOOTING_ITEM1}</li>
          <li>{strings.TROUBLESHOOTING_ITEM2}</li>
          <li>{strings.TROUBLESHOOTING_ITEM3}</li>
        </ul>
      </section>
    </div>
  </Layout>
)

export default TechnicalDocumentation
