import React, { useState } from 'react'
import {
  Button,
  Paper,
  Checkbox,
  Link,
  FormHelperText,
} from '@mui/material'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import env from '@/config/env.config'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'
import SimpleBackdrop from '@/components/SimpleBackdrop'
import { buildAuth0LoginOptions } from '@/utils/auth0'

import '@/assets/css/signup.css'

const SignUp = () => {
  const navigate = useNavigate()
  const { loginWithRedirect } = useAuth0()

  const [visible, setVisible] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [tosError, setTosError] = useState('')
  const [authError, setAuthError] = useState('')
  const [isStartingAuth, setIsStartingAuth] = useState(false)

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  const handleSignUp = async () => {
    if (!tosAccepted) {
      setTosError(commonStrings.TOS_ERROR)
      return
    }

    try {
      setAuthError('')
      setTosError('')
      setIsStartingAuth(true)
      await loginWithRedirect(buildAuth0LoginOptions('signup'))
    } catch (err) {
      console.error(err)
      setAuthError(strings.AUTH0_SIGN_UP_ERROR)
      setIsStartingAuth(false)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signup">
        <div className={`signup-shell ${visible ? '' : 'hidden'}`}>
          <Paper className="signup-form" elevation={0}>
            <div className="signup-form-header">
              <span className="signup-form-badge">Auth0</span>
              <h1 className="signup-form-title">{strings.SIGN_UP_HEADING}</h1>
              <p className="signup-form-subtitle">{strings.AUTH0_SIGN_UP_MESSAGE}</p>
            </div>

            <div className="signup-tos">
              <Checkbox
                checked={tosAccepted}
                color="primary"
                onChange={(e) => {
                  setTosAccepted(e.target.checked)
                  if (tosError) {
                    setTosError('')
                  }
                }}
              />
              <div className="signup-tos-copy">
                <Link href="/tos" target="_blank" rel="noreferrer" className="signup-tos-link">
                  {commonStrings.TOS}
                </Link>
              </div>
            </div>

            <FormHelperText error={!!tosError} className="signup-tos-error">{tosError}</FormHelperText>

            <Button
              type="button"
              variant="contained"
              className="btn-primary signup-primary-action"
              fullWidth
              startIcon={<PersonAddAltRoundedIcon />}
              onClick={handleSignUp}
            >
              {strings.AUTH0_CREATE_ACCOUNT}
            </Button>

            <SocialLogin className="signup-socials" mode="signup" onError={() => setAuthError(strings.AUTH0_SIGN_UP_ERROR)} />

            <div className="signup-actions">
              <Button variant="outlined" color="primary" className="signup-secondary-action" onClick={() => navigate('/sign-in')} fullWidth>
                {strings.GO_TO_SIGN_IN}
              </Button>
              <Button variant="outlined" color="primary" className="signup-secondary-action" onClick={() => navigate('/')} fullWidth>
                {commonStrings.CANCEL}
              </Button>
            </div>

            <div className="form-error signup-error">
              {authError && <Error message={authError} />}
            </div>
          </Paper>

          <section className="signup-hero" aria-label={strings.SIGN_UP_HEADING}>
            <span className="signup-eyebrow">{env.WEBSITE_NAME}</span>
            <h2 className="signup-hero-title">{strings.SIGN_UP_HEADING}</h2>
            <p className="signup-hero-subtitle">{strings.AUTH0_SIGN_UP_MESSAGE}</p>

            <div className="signup-hero-pills">
              <span>
                <VerifiedRoundedIcon />
                Auth0
              </span>
              <span>
                <DescriptionRoundedIcon />
                {commonStrings.TOS}
              </span>
              <span>
                <AutoAwesomeRoundedIcon />
                Google - Facebook - X
              </span>
            </div>

            <div className="signup-hero-visual">
              <div className="signup-feature-card signup-feature-card-primary">
                <span className="signup-feature-label">Auth0</span>
                <strong>{strings.AUTH0_CREATE_ACCOUNT}</strong>
                <p>{strings.AUTH0_SIGN_UP_MESSAGE}</p>
              </div>

              <div className="signup-feature-card signup-feature-card-secondary">
                <span className="signup-feature-label">{env.WEBSITE_NAME}</span>
                <div className="signup-provider-grid">
                  <span>Google</span>
                  <span>Facebook</span>
                  <span>X</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />

      {isStartingAuth && <SimpleBackdrop text={strings.AUTH0_REDIRECTING} progress />}
    </Layout>
  )
}

export default SignUp
