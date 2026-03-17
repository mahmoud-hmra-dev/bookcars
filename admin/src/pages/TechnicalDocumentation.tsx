import React from 'react'
import Layout from '@/components/Layout'
import { strings } from '@/lang/technical-documentation'

import '@/assets/css/documentation.css'

const TechnicalDocumentation = () => (
  <Layout strict admin>
    <div className="documentation">
      <h1>{strings.TITLE}</h1>
      <p>{strings.INTRO}</p>

      <h2>{strings.SECTION1_TITLE}</h2>
      <ul>
        <li>{strings.SECTION1_ITEM1}</li>
        <li>{strings.SECTION1_ITEM2}</li>
      </ul>

      <h2>{strings.SECTION2_TITLE}</h2>
      <ul>
        <li>{strings.SECTION2_ITEM1}</li>
        <li>{strings.SECTION2_ITEM2}</li>
      </ul>

      <h2>{strings.SECTION3_TITLE}</h2>
      <ul>
        <li>{strings.SECTION3_ITEM1}</li>
        <li>{strings.SECTION3_ITEM2}</li>
      </ul>
    </div>
  </Layout>
)

export default TechnicalDocumentation
