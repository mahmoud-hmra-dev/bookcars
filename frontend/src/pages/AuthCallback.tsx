import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import ErrorView from '@/components/Error'
import SimpleBackdrop from '@/components/SimpleBackdrop'
import * as UserService from '@/services/UserService'
import { useUserContext, UserContextType } from '@/context/UserContext'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, user, getIdTokenClaims } = useAuth0()
  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [error, setError] = React.useState('')
  const doneRef = React.useRef(false)

  React.useEffect(() => {
    const run = async () => {
      if (doneRef.current || isLoading || !isAuthenticated) {
        return
      }

      doneRef.current = true

      try {
        const claims = await getIdTokenClaims()
        const idToken = claims?.__raw
        const email = String(claims?.email || user?.email || '')
        const fullName = String(claims?.name || user?.name || email)
        const avatar = String(claims?.picture || user?.picture || '') || undefined

        if (!idToken || !email) {
          throw new globalThis.Error('Auth0 id token or email missing')
        }

        const res = await UserService.socialSignin({
          socialSignInType: bookcarsTypes.SocialSignInType.Auth0,
          accessToken: idToken,
          email,
          fullName,
          avatar,
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
        navigate('/')
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Authentication failed')
      }
    }

    run()
  }, [getIdTokenClaims, isAuthenticated, isLoading, navigate, setUser, setUserLoaded, user])

  return (
    <Layout strict>
      {error ? <ErrorView message={error} homeLink /> : <SimpleBackdrop progress text="Signing you in..." />}
    </Layout>
  )
}

export default AuthCallback
