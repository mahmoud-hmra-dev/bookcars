import React, { useState } from 'react'
import { Paper, Button } from '@mui/material'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded'
import PublicRoundedIcon from '@mui/icons-material/PublicRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import * as bookcarsTypes from ':bookcars-types'
import { strings as suStrings } from '@/lang/sign-up'
import { strings } from '@/lang/sign-in'
import env from '@/config/env.config'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'
import Error from '@/components/Error'
import SimpleBackdrop from '@/components/SimpleBackdrop'
import { buildAuth0LoginOptions } from '@/utils/auth0'

import '@/assets/css/signin.css'

const SignIn = () => {
  const navigate = useNavigate()
  const { loginWithRedirect } = useAuth0()

  const [visible, setVisible] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isStartingAuth, setIsStartingAuth] = useState(false)

  const onLoad = async (user?: bookcarsTypes.User) => {
    UserService.setStayConnected(false)

    if (user) {
      const params = new URLSearchParams(window.location.search)

      if (params.has('from')) {
        const from = params.get('from')
        if (from === 'checkout') {
          navigate('/checkout', {
            state: {
              carId: params.get('c'),
              pickupLocationId: params.get('p'),
              dropOffLocationId: params.get('d'),
              from: new Date(Number(params.get('f'))),
              to: new Date(Number(params.get('t'))),
            }
          })
        } else {
          navigate('/')
        }
      } else {
        navigate('/')
      }
    } else {
      setVisible(true)
    }
  }

  const handleSignIn = async () => {
    try {
      setAuthError('')
      setIsStartingAuth(true)
      await loginWithRedirect(buildAuth0LoginOptions('signin'))
    } catch (err) {
      console.error(err)
      setAuthError(strings.AUTH0_SIGN_IN_ERROR)
      setIsStartingAuth(false)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signin">
        <div className={`signin-shell ${visible ? '' : 'hidden'}`}>
          <section className="signin-hero" aria-label={strings.SIGN_IN_HEADING}>
            <span className="signin-eyebrow">{env.WEBSITE_NAME}</span>
            <h1 className="signin-hero-title">{strings.SIGN_IN_HEADING}</h1>
            <p className="signin-hero-subtitle">{strings.AUTH0_SIGN_IN_MESSAGE}</p>

            <div className="signin-hero-pills">
              <span>
                <ShieldRoundedIcon />
                Auth0
              </span>
              <span>
                <FlashOnRoundedIcon />
                {strings.STAY_CONNECTED}
              </span>
              <span>
                <PublicRoundedIcon />
                Google - Facebook - X
              </span>
            </div>

            <div className="signin-hero-visual">
              <div className="signin-visual-card signin-visual-card-primary">
                <span className="signin-visual-label">Auth0</span>
                <strong>{env.WEBSITE_NAME}</strong>
                <p>{strings.AUTH0_SIGN_IN_MESSAGE}</p>
              </div>
              <div className="signin-visual-card signin-visual-card-secondary">
                <span className="signin-visual-label">{strings.STAY_CONNECTED}</span>
                <div className="signin-brand-cloud">
                  <span>Google</span>
                  <span>Facebook</span>
                  <span>X</span>
                </div>
              </div>
            </div>
          </section>

          <Paper className="signin-form" elevation={0}>
            <div className="signin-form-header">
              <span className="signin-form-badge">Auth0</span>
              <h2 className="signin-form-title">{strings.SIGN_IN_HEADING}</h2>
              <p className="signin-form-subtitle">{strings.AUTH0_SIGN_IN_MESSAGE}</p>
            </div>

            <div className="stay-connected">
              <input
                id="stay-connected"
                type="checkbox"
                onChange={(e) => UserService.setStayConnected(e.currentTarget.checked)}
              />
              <label htmlFor="stay-connected">
                {strings.STAY_CONNECTED}
              </label>
            </div>

            <Button
              type="button"
              variant="contained"
              className="btn-primary signin-primary-action"
              fullWidth
              startIcon={<LoginRoundedIcon />}
              onClick={handleSignIn}
            >
              {strings.AUTH0_CONTINUE}
            </Button>

            <SocialLogin className="signin-socials" mode="signin" onError={() => setAuthError(strings.AUTH0_SIGN_IN_ERROR)} />

            <div className="signin-buttons">
              <Button variant="outlined" color="primary" onClick={() => navigate('/sign-up')} className="signin-secondary-action" fullWidth>
                {suStrings.SIGN_UP}
              </Button>
            </div>

            <div className="form-error signin-error">
              {authError && <Error message={authError} />}
            </div>
          </Paper>
        </div>
      </div>

      <Footer />

      {isStartingAuth && <SimpleBackdrop progress text={strings.AUTH0_REDIRECTING} />}

    </Layout>
  )
}

export default SignIn
