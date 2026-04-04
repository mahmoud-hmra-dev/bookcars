import React from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import { buildAuth0LoginOptions } from '@/utils/auth0'
import type { Auth0FlowMode } from '@/utils/auth0'

import GoogleIcon from '@/assets/img/google-icon.png'

import '@/assets/css/social-login.css'

interface SocialLoginProps {
  mode?: Auth0FlowMode
  className?: string
  returnTo?: string
  onError?: (error: any) => void
}

const SocialLogin = ({
  mode = 'signin',
  className,
  returnTo,
  onError,
}: SocialLoginProps) => {
  const { loginWithRedirect } = useAuth0()
  const providers = [
    {
      connection: env.AUTH0_CONNECTION_GOOGLE,
      label: 'Google',
      icon: <img alt="Google" src={GoogleIcon} className="social" />,
    },
  ]

  const startLogin = async (connection: string) => {
    try {
      await loginWithRedirect(buildAuth0LoginOptions(mode, connection, returnTo))
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
        {providers.map((provider) => (
          <button
            key={provider.label}
            type="button"
            className="social"
            onClick={() => startLogin(provider.connection)}
            aria-label={provider.label}
          >
            <span className="social-icon">{provider.icon}</span>
            <span className="social-label">{provider.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SocialLogin
