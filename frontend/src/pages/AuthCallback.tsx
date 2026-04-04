import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import * as bookcarsTypes from ':bookcars-types'
import ErrorView from '@/components/Error'
import SimpleBackdrop from '@/components/SimpleBackdrop'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { consumeAuth0ReturnTo } from '@/utils/auth0'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, user, error, getIdTokenClaims, getAccessTokenSilently } = useAuth0()
  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [callbackError, setCallbackError] = React.useState('')
  const doneRef = React.useRef(false)

  React.useEffect(() => {
    const syncAuth0User = async () => {
      if (doneRef.current || isLoading) {
        return
      }

      if (!isAuthenticated) {
        if (error) {
          setCallbackError(error.message || commonStrings.GENERIC_ERROR)
          return
        }

        navigate('/sign-in', { replace: true })
        return
      }

      doneRef.current = true

      try {
        const claims = await getIdTokenClaims()
        const idToken = claims?.__raw

        let email = String(claims?.email || user?.email || '')
        let fullName = String(claims?.name || user?.name || '')
        let avatar = String(claims?.picture || user?.picture || '') || undefined

        let auth0AT: string | undefined
        try {
          auth0AT = await getAccessTokenSilently()
        } catch (e) {
          // access token may not be available
        }

        // Fallback: fetch from /userinfo endpoint when email is missing (Facebook, Auth0 DB connections)
        if (idToken && !email && auth0AT) {
          try {
            const domain = env.AUTH0_DOMAIN.replace(/^https?:\/\//, '')
            const res = await fetch(`https://${domain}/userinfo`, {
              headers: { Authorization: `Bearer ${auth0AT}` },
            })
            if (res.ok) {
              const info = await res.json()
              email = String(info.email || '')
              if (!fullName) {
                fullName = String(info.name || '')
              }
              if (!avatar) {
                avatar = String(info.picture || '') || undefined
              }
            }
          } catch (e) {
            console.warn('Auth0 /userinfo fallback failed:', e)
          }
        }

        if (!fullName) {
          fullName = email
        }

        if (!idToken || !email) {
          throw new globalThis.Error('Auth0 id token or email missing')
        }

        const res = await UserService.socialSignin({
          socialSignInType: bookcarsTypes.SocialSignInType.Auth0,
          accessToken: idToken,
          auth0AccessToken: auth0AT,
          email,
          fullName,
          avatar,
          language: UserService.getLanguage(),
          stayConnected: UserService.getStayConnected(),
        })

        if (res.status !== 200) {
          throw new globalThis.Error('Application social sign-in failed')
        }

        if (res.data.blacklisted) {
          await UserService.signout(false)
          throw new globalThis.Error('User is blacklisted')
        }

        const appUser = await UserService.getUser(res.data._id)
        setUser(appUser)
        setUserLoaded(true)
        navigate(consumeAuth0ReturnTo('/'), { replace: true })
      } catch (err: any) {
        console.error(err)
        setCallbackError(err?.message || 'Authentication failed')
        setUserLoaded(true)
      }
    }

    syncAuth0User()
  }, [error, getAccessTokenSilently, getIdTokenClaims, isAuthenticated, isLoading, navigate, setUser, setUserLoaded, user])

  return callbackError
    ? <ErrorView message={callbackError} homeLink />
    : <SimpleBackdrop progress text="Signing you in..." />
}

export default AuthCallback
