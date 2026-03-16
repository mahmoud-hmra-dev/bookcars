import React from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'

import FacebookIcon from '@/assets/img/facebook-icon.png'
import GoogleIcon from '@/assets/img/google-icon.png'

import '@/assets/css/social-login.css'

interface SocialLoginProps {
  facebook?: boolean
  apple?: boolean
  google?: boolean
  redirectToHomepage?: boolean
  reloadPage?: boolean
  className?: string
  onError?: (error: any) => void
  onSignInError?: () => void
  onBlackListed?: () => void
}

const SocialLogin = ({
  className,
  onError,
}: SocialLoginProps) => {
  const { loginWithRedirect } = useAuth0()

  const startLogin = async (connection: string) => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection,
          prompt: 'login',
        },
      })
    } catch (err) {
      console.error(err)
      onError?.(err)
    }
  }

  return (
    <div className={`${className ? `${className} ` : ''}social-login`}>
      <div className="separator">
        <hr />
        <span>{commonStrings.OR}</span>
        <hr />
      </div>

      <div className="login-buttons">
        <button type="button" className="social" onClick={() => startLogin(env.AUTH0_CONNECTION_FACEBOOK)}>
          <img alt="Facebook" src={FacebookIcon} className="social" />
        </button>

        <button type="button" className="social" onClick={() => startLogin(env.AUTH0_CONNECTION_GOOGLE)}>
          <img alt="Google" src={GoogleIcon} className="social" />
        </button>

        <button type="button" className="social" onClick={() => startLogin(env.AUTH0_CONNECTION_TWITTER)} aria-label="X / Twitter">
          <span style={{ fontWeight: 700, fontSize: 18, lineHeight: 1 }}>X</span>
        </button>
      </div>
    </div>
  )
}

export default SocialLogin
