import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogContent,
  Tab,
  Tabs,
} from '@mui/material'
import {
  LocationOn,
  DirectionsCar,
  DriveEta,
  GpsFixed,
  Security,
  SupportAgent,
  Speed,
  Map as MapIcon,
  ArrowForward,
  CheckCircle,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings } from '@/lang/home'
import * as SupplierService from '@/services/SupplierService'
import * as CountryService from '@/services/CountryService'
import * as LocationService from '@/services/LocationService'
import Layout from '@/components/Layout'
import SupplierCarrousel from '@/components/SupplierCarrousel'
import TabPanel, { a11yProps } from '@/components/TabPanel'
import LocationCarrousel from '@/components/LocationCarrousel'
import SearchForm from '@/components/SearchForm'
import Map from '@/components/Map'
import Footer from '@/components/Footer'

import '@/assets/css/home.css'

const Home = () => {
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [countries, setCountries] = useState<bookcarsTypes.CountryInfo[]>([])
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [sameLocation, setSameLocation] = useState(true)
  const [tabValue, setTabValue] = useState(0)
  const [openLocationSearchFormDialog, setOpenLocationSearchFormDialog] = useState(false)
  const [locations, setLocations] = useState<bookcarsTypes.Location[]>([])
  const [videoLoaded, setVideoLoaded] = useState(false)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const video = entry.target as HTMLVideoElement
      if (entry.isIntersecting) {
        video.muted = true
        video.play()
      } else {
        video.pause()
      }
    })
  }

  const onLoad = async () => {
    if (!env.HIDE_SUPPLIERS) {
      let _suppliers = await SupplierService.getAllSuppliers()
      _suppliers = _suppliers.filter((supplier) => supplier.avatar && !/no-image/i.test(supplier.avatar))
      bookcarsHelper.shuffle(_suppliers)
      setSuppliers(_suppliers)
    }

    const _countries = await CountryService.getCountriesWithLocations('', true, env.MIN_LOCATIONS)
    setCountries(_countries)
    const _locations = await LocationService.getLocationsWithPosition()
    setLocations(_locations)

    const observer = new IntersectionObserver(handleIntersection)
    const video = document.getElementById('cover') as HTMLVideoElement
    if (video) {
      observer.observe(video)
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="home">

        {/* ===== HERO + SEARCH ===== */}
        <section className="hero">
          <div className="hero-video">
            <video
              id="cover"
              muted={!env.isSafari}
              autoPlay={!env.isSafari}
              loop
              playsInline
              disablePictureInPicture
              onLoadedData={() => setVideoLoaded(true)}
            >
              <source src="cover.mp4" type="video/mp4" />
              <track kind="captions" />
            </video>
            {!videoLoaded && <div className="hero-fallback" />}
          </div>
          <div className="hero-overlay" />
          <div className="hero-content">
            <span className="hero-badge">
              <GpsFixed style={{ fontSize: 16 }} />
              {strings.GPS_TRACKED_FLEET}
            </span>
            <h1 className="hero-heading">{strings.COVER}</h1>
            <p className="hero-sub">{strings.SUBTITLE || strings.TITLE}</p>
            <div className="hero-search">
              <SearchForm />
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="how-it-works">
          <h2 className="section-title">{strings.HOW_IT_WORKS}</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-icon"><LocationOn /></div>
              <h3>{strings.STEP_CHOOSE_LOCATION}</h3>
              <p>{strings.STEP_CHOOSE_LOCATION_DESC}</p>
            </div>
            <div className="step-arrow"><ArrowForward /></div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-icon"><DirectionsCar /></div>
              <h3>{strings.STEP_SELECT_CAR}</h3>
              <p>{strings.STEP_SELECT_CAR_DESC}</p>
            </div>
            <div className="step-arrow"><ArrowForward /></div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-icon"><DriveEta /></div>
              <h3>{strings.STEP_DRIVE_AWAY}</h3>
              <p>{strings.STEP_DRIVE_AWAY_DESC}</p>
            </div>
          </div>
        </section>

        {/* ===== TRUST SIGNALS ===== */}
        <section className="trust-strip">
          <div className="trust-item">
            <DirectionsCar className="trust-icon" />
            <div className="trust-number">500+</div>
            <div className="trust-label">{strings.CARS_AVAILABLE}</div>
          </div>
          <div className="trust-item">
            <MapIcon className="trust-icon" />
            <div className="trust-number">50+</div>
            <div className="trust-label">{strings.TRUST_LOCATIONS}</div>
          </div>
          <div className="trust-item">
            <SupportAgent className="trust-icon" />
            <div className="trust-number">24/7</div>
            <div className="trust-label">{strings.TRUST_SUPPORT}</div>
          </div>
          <div className="trust-item">
            <GpsFixed className="trust-icon" />
            <div className="trust-number">100%</div>
            <div className="trust-label">{strings.GPS_TRACKED}</div>
          </div>
        </section>

        {/* ===== GPS TRACKING SHOWCASE ===== */}
        <section className="gps-section">
          <div className="gps-content">
            <span className="gps-badge">{strings.SAFETY_FIRST}</span>
            <h2>{strings.REALTIME_GPS_TRACKING}</h2>
            <p>{strings.GPS_DESCRIPTION}</p>
            <div className="gps-features">
              <div className="gps-feature">
                <CheckCircle className="gps-check" />
                <span>{strings.LIVE_VEHICLE_LOCATION}</span>
              </div>
              <div className="gps-feature">
                <CheckCircle className="gps-check" />
                <span>{strings.ROUTE_HISTORY}</span>
              </div>
              <div className="gps-feature">
                <CheckCircle className="gps-check" />
                <span>{strings.GEOFENCE_ALERTS}</span>
              </div>
              <div className="gps-feature">
                <CheckCircle className="gps-check" />
                <span>{strings.ROADSIDE_ASSISTANCE}</span>
              </div>
            </div>
          </div>
          <div className="gps-visual">
            <div className="gps-map-preview">
              <GpsFixed className="gps-pulse" />
              <Security className="gps-shield" />
              <Speed className="gps-speed" />
            </div>
          </div>
        </section>

        {/* ===== SUPPLIERS ===== */}
        {suppliers.length > 3 && (
          <section className="home-suppliers">
            <h2 className="section-title">{strings.SUPPLIERS_TITLE}</h2>
            <SupplierCarrousel suppliers={suppliers} />
          </section>
        )}

        {/* ===== DESTINATIONS ===== */}
        {countries.length > 0 && (
          <section className="destinations">
            <h2 className="section-title">{strings.DESTINATIONS_TITLE}</h2>
            <div className="tabs">
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="destinations"
                TabIndicatorProps={{ sx: { display: env.isMobile ? 'none' : null } }}
                sx={{
                  '& .MuiTabs-flexContainer': { flexWrap: 'wrap', justifyContent: 'center' },
                }}
              >
                {countries.map((country, index) => (
                  <Tab key={country._id} label={country.name?.toUpperCase()} {...a11yProps(index)} />
                ))}
              </Tabs>
              {countries.map((country, index) => (
                <TabPanel key={country._id} value={tabValue} index={index}>
                  <LocationCarrousel
                    locations={country.locations!}
                    onSelect={(location) => {
                      setPickupLocation(location._id)
                      setOpenLocationSearchFormDialog(true)
                    }}
                  />
                </TabPanel>
              ))}
            </div>
          </section>
        )}

        {/* ===== MAP ===== */}
        <section className="home-map">
          <h2 className="section-title">{strings.MAP_TITLE}</h2>
          <Map
            position={[env.MAP_LATITUDE, env.MAP_LONGITUDE]}
            initialZoom={env.MAP_ZOOM}
            locations={locations}
            onSelelectPickUpLocation={async (locationId) => {
              setPickupLocation(locationId)
              if (sameLocation) {
                setDropOffLocation(locationId)
              } else {
                setSameLocation(dropOffLocation === locationId)
              }
              setOpenLocationSearchFormDialog(true)
            }}
          />
        </section>

        {/* ===== CTA ===== */}
        <section className="cta-section">
          <h2>{strings.CUSTOMER_CARE_TITLE}</h2>
          <p>{strings.CUSTOMER_CARE_TEXT}</p>
          <Button
            variant="contained"
            className="btn-primary btn-cta"
            endIcon={<ArrowForward />}
            onClick={() => navigate('/contact')}
          >
            {strings.CONTACT_US}
          </Button>
        </section>
      </div>

      <Dialog
        maxWidth={false}
        open={openLocationSearchFormDialog}
        onClose={() => setOpenLocationSearchFormDialog(false)}
      >
        <DialogContent className="search-dialog-content">
          <SearchForm
            ranges={bookcarsHelper.getAllRanges()}
            pickupLocation={pickupLocation}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </Layout>
  )
}

export default Home
