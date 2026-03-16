import React, { useState } from 'react'
import { Paper, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import * as bookcarsTypes from ':bookcars-types'
import { strings as suStrings } from '@/lang/sign-up'
import { strings } from '@/lang/sign-in'
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
        <Paper className={`signin-form ${visible ? '' : 'hidden'}`} elevation={10}>
          <h1 className="signin-form-title">{strings.SIGN_IN_HEADING}</h1>
          <p>{strings.AUTH0_SIGN_IN_MESSAGE}</p>

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

          <Button type="button" variant="contained" className="btn-primary btn-margin btn-margin-bottom" onClick={handleSignIn}>
            {strings.AUTH0_CONTINUE}
          </Button>

          <SocialLogin mode="signin" onError={() => setAuthError(strings.AUTH0_SIGN_IN_ERROR)} />

          <div className="signin-buttons">
            <Button variant="outlined" color="primary" onClick={() => navigate('/sign-up')} className="btn-margin btn-margin-bottom">
              {suStrings.SIGN_UP}
            </Button>
          </div>

          <div className="form-error">
            {authError && <Error message={authError} />}
          </div>
        </Paper>
      </div>

      <Footer />

      {isStartingAuth && <SimpleBackdrop progress text={strings.AUTH0_REDIRECTING} />}

    </Layout>
  )
}

export default SignIn
