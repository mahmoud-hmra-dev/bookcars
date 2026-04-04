import React, { useState } from 'react'
import {
  Paper,
  Button,
  FormControl,
  InputLabel,
  Input,
  FormHelperText,
} from '@mui/material'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as suStrings } from '@/lang/sign-up'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-in'
import env from '@/config/env.config'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'
import Error from '@/components/Error'
import PasswordInput from '@/components/PasswordInput'
import { schema, FormFields } from '@/models/SignInForm'

import '@/assets/css/signin.css'

const SignIn = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      stayConnected: false,
    },
  })

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

  const signinError = () => {
    setError('root', { message: strings.ERROR_IN_SIGN_IN })
  }

  const onSubmit = async ({ email, password, stayConnected }: FormFields) => {
    try {
      const data: bookcarsTypes.SignInPayload = {
        email,
        password,
        stayConnected,
      }

      const res = await UserService.signin(data)

      if (res.status === 200) {
        if (res.data.blacklisted) {
          await UserService.signout(false)
          setError('root', { message: strings.IS_BLACKLISTED })
        } else {
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
        }
      } else {
        signinError()
      }
    } catch {
      signinError()
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signin">
        <div className={`signin-shell ${visible ? '' : 'hidden'}`}>
          <section className="signin-hero" aria-label={strings.SIGN_IN_HEADING}>
            <span className="signin-eyebrow">{env.WEBSITE_NAME}</span>
            <h1 className="signin-hero-title">{strings.SIGN_IN_HEADING}</h1>
            <p className="signin-hero-subtitle">{strings.SIGN_IN_MESSAGE}</p>

            <div className="signin-hero-pills">
              <span>
                <ShieldRoundedIcon />
                {strings.SIGN_IN_HEADING}
              </span>
              <span>
                <FlashOnRoundedIcon />
                {strings.STAY_CONNECTED}
              </span>
            </div>

            <div className="signin-hero-visual">
              <div className="signin-visual-card signin-visual-card-primary">
                <span className="signin-visual-label">{env.WEBSITE_NAME}</span>
                <strong>{strings.SIGN_IN_HEADING}</strong>
                <p>{strings.SIGN_IN_MESSAGE}</p>
              </div>
              <div className="signin-visual-card signin-visual-card-secondary">
                <span className="signin-visual-label">Google</span>
                <div className="signin-brand-cloud">
                  <span>Google</span>
                </div>
              </div>
            </div>
          </section>

          <Paper className="signin-form" elevation={0}>
            <div className="signin-form-header">
              <span className="signin-form-badge">{env.WEBSITE_NAME}</span>
              <h2 className="signin-form-title">{strings.SIGN_IN_HEADING}</h2>
              <p className="signin-form-subtitle">{strings.SIGN_IN_MESSAGE}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl fullWidth margin="dense" error={!!errors.email}>
                <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                <Input
                  {...register('email')}
                  onChange={(e) => {
                    if (errors.email) {
                      clearErrors('email')
                    }
                    setValue('email', e.target.value)
                  }}
                  autoComplete="email"
                  required
                />
                <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
              </FormControl>

              <PasswordInput
                label={commonStrings.PASSWORD}
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                onChange={(e) => {
                  if (errors.password) {
                    clearErrors('password')
                  }
                  setValue('password', e.target.value)
                }}
                required
                autoComplete="current-password"
              />

              <div className="stay-connected">
                <input
                  id="stay-connected"
                  type="checkbox"
                  onChange={(e) => {
                    setValue('stayConnected', e.currentTarget.checked)
                    UserService.setStayConnected(e.currentTarget.checked)
                  }}
                />
                <label htmlFor="stay-connected">
                  {strings.STAY_CONNECTED}
                </label>
              </div>

              <div className="forgot-password">
                <Button variant="text" onClick={() => navigate('/forgot-password')} className="btn-lnk">{strings.RESET_PASSWORD}</Button>
              </div>

              <Button
                type="submit"
                variant="contained"
                className="btn-primary signin-primary-action"
                fullWidth
                startIcon={<LoginRoundedIcon />}
                disabled={isSubmitting}
              >
                {strings.SIGN_IN}
              </Button>
            </form>

            <SocialLogin className="signin-socials" mode="signin" />

            <div className="signin-buttons">
              <Button variant="outlined" color="primary" onClick={() => navigate('/sign-up')} className="signin-secondary-action" fullWidth>
                {suStrings.SIGN_UP}
              </Button>
            </div>

            <div className="form-error signin-error">
              {errors.root && <Error message={errors.root.message!} />}
            </div>
          </Paper>
        </div>
      </div>

      <Footer />
    </Layout>
  )
}

export default SignIn
