import React, { useState } from 'react'
import {
  Button,
  Paper,
  Checkbox,
  Link,
  FormHelperText,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
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
        <Paper className={`signup-form ${visible ? '' : 'hidden'}`} elevation={10}>
          <h1 className="signup-form-title">{strings.SIGN_UP_HEADING}</h1>
          <p>{strings.AUTH0_SIGN_UP_MESSAGE}</p>

          <div className="signup-tos">
            <table>
              <tbody>
                <tr>
                  <td aria-label="tos">
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
                  </td>
                  <td>
                    <Link href="/tos" target="_blank" rel="noreferrer">
                      {commonStrings.TOS}
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <FormHelperText error={!!tosError}>{tosError}</FormHelperText>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <Button type="button" variant="contained" className="btn-primary btn-margin-bottom" onClick={handleSignUp}>
            {strings.AUTH0_CREATE_ACCOUNT}
          </Button>

          <SocialLogin mode="signup" onError={() => setAuthError(strings.AUTH0_SIGN_UP_ERROR)} />

          <div className="buttons">
            <Button variant="outlined" color="primary" className="btn-margin-bottom" onClick={() => navigate('/sign-in')}>
              {strings.GO_TO_SIGN_IN}
            </Button>
            <Button variant="outlined" color="primary" className="btn-margin-bottom" onClick={() => navigate('/')}>
              {commonStrings.CANCEL}
            </Button>
          </div>

          <div className="form-error">
            {authError && <Error message={authError} />}
          </div>
        </Paper>
      </div>

      <Footer />

      {isStartingAuth && <SimpleBackdrop text={strings.AUTH0_REDIRECTING} progress />}
    </Layout>
  )
}

export default SignUp
