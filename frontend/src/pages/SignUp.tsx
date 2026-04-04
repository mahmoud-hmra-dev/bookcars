import React, { useState } from 'react'
import {
  Button,
  Paper,
  Checkbox,
  Link,
  FormHelperText,
  FormControl,
  InputLabel,
  Input,
} from '@mui/material'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import env from '@/config/env.config'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import SocialLogin from '@/components/SocialLogin'
import Footer from '@/components/Footer'
import PasswordInput from '@/components/PasswordInput'
import DatePicker from '@/components/DatePicker'
import { schema, FormFields } from '@/models/SignUpForm'

import '@/assets/css/signup.css'

const SignUp = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    setValue,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      tos: false,
    },
  })

  const tosValue = useWatch({ control, name: 'tos' })
  const birthDate = useWatch({ control, name: 'birthDate' })

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  const onSubmit = async (data: FormFields) => {
    try {
      const language = UserService.getLanguage()

      const payload: bookcarsTypes.SignUpPayload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        birthDate: data.birthDate,
        language,
      }

      const status = await UserService.signup(payload)

      if (status === 200) {
        setSignUpSuccess(true)
      } else {
        setError('root', { message: strings.SIGN_UP_ERROR })
      }
    } catch {
      setError('root', { message: strings.SIGN_UP_ERROR })
    }
  }

  const handleEmailValidation = async (email: string) => {
    if (email) {
      try {
        const status = await UserService.validateEmail({ email })
        if (status === 200) {
          setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
          return false
        }
        return true
      } catch {
        return true
      }
    }
    return true
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="signup">
        <div className={`signup-shell ${visible ? '' : 'hidden'}`}>
          <Paper className="signup-form" elevation={0}>
            {signUpSuccess ? (
              <div className="signup-success">
                <h2 className="signup-form-title">{strings.SIGN_UP_HEADING}</h2>
                <p className="signup-success-message">{strings.SIGN_UP_SUCCESS}</p>
                <Button variant="contained" className="btn-primary" onClick={() => navigate('/sign-in')} fullWidth>
                  {strings.GO_TO_SIGN_IN}
                </Button>
              </div>
            ) : (
              <>
                <div className="signup-form-header">
                  <span className="signup-form-badge">{env.WEBSITE_NAME}</span>
                  <h1 className="signup-form-title">{strings.SIGN_UP_HEADING}</h1>
                  <p className="signup-form-subtitle">{strings.SIGN_UP_MESSAGE}</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <FormControl fullWidth margin="dense" error={!!errors.fullName}>
                    <InputLabel htmlFor="fullName">{commonStrings.FULL_NAME}</InputLabel>
                    <Input
                      {...register('fullName')}
                      onChange={(e) => {
                        if (errors.fullName) {
                          clearErrors('fullName')
                        }
                        setValue('fullName', e.target.value)
                      }}
                      autoComplete="name"
                      required
                    />
                    <FormHelperText>{errors.fullName?.message || ''}</FormHelperText>
                  </FormControl>

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
                      onBlur={(e) => handleEmailValidation(e.target.value)}
                      autoComplete="email"
                      required
                    />
                    <FormHelperText>{errors.email?.message || ''}</FormHelperText>
                  </FormControl>

                  <FormControl fullWidth margin="dense" error={!!errors.phone}>
                    <InputLabel htmlFor="phone">{commonStrings.PHONE}</InputLabel>
                    <Input
                      {...register('phone')}
                      onChange={(e) => {
                        if (errors.phone) {
                          clearErrors('phone')
                        }
                        setValue('phone', e.target.value)
                      }}
                      autoComplete="tel"
                      required
                    />
                    <FormHelperText>{errors.phone?.message || ''}</FormHelperText>
                  </FormControl>

                  <FormControl fullWidth margin="dense" error={!!errors.birthDate}>
                    <DatePicker
                      label={commonStrings.BIRTH_DATE}
                      variant="standard"
                      required
                      value={birthDate || undefined}
                      onChange={(date) => {
                        if (date) {
                          if (errors.birthDate) {
                            clearErrors('birthDate')
                          }
                          setValue('birthDate', date, { shouldValidate: true })
                        }
                      }}
                      language={UserService.getLanguage()}
                    />
                    <FormHelperText>{errors.birthDate?.message || ''}</FormHelperText>
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
                    autoComplete="new-password"
                  />

                  <PasswordInput
                    label={commonStrings.CONFIRM_PASSWORD}
                    {...register('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    onChange={(e) => {
                      if (errors.confirmPassword) {
                        clearErrors('confirmPassword')
                      }
                      setValue('confirmPassword', e.target.value)
                    }}
                    required
                    autoComplete="new-password"
                  />

                  <div className="signup-tos">
                    <Checkbox
                      checked={tosValue || false}
                      color="primary"
                      onChange={(e) => {
                        setValue('tos', e.target.checked)
                        if (errors.tos) {
                          clearErrors('tos')
                        }
                      }}
                    />
                    <div className="signup-tos-copy">
                      <Link href="/tos" target="_blank" rel="noreferrer" className="signup-tos-link">
                        {commonStrings.TOS}
                      </Link>
                    </div>
                  </div>

                  <FormHelperText error={!!errors.tos} className="signup-tos-error">{errors.tos?.message || ''}</FormHelperText>

                  <Button
                    type="submit"
                    variant="contained"
                    className="btn-primary signup-primary-action"
                    fullWidth
                    startIcon={<PersonAddAltRoundedIcon />}
                    disabled={isSubmitting}
                  >
                    {strings.SIGN_UP}
                  </Button>
                </form>

                <SocialLogin className="signup-socials" mode="signup" />

                <div className="signup-actions">
                  <Button variant="outlined" color="primary" className="signup-secondary-action" onClick={() => navigate('/sign-in')} fullWidth>
                    {strings.GO_TO_SIGN_IN}
                  </Button>
                  <Button variant="outlined" color="primary" className="signup-secondary-action" onClick={() => navigate('/')} fullWidth>
                    {commonStrings.CANCEL}
                  </Button>
                </div>

                <div className="form-error signup-error">
                  {errors.root && <Error message={errors.root.message!} />}
                </div>
              </>
            )}
          </Paper>

          <section className="signup-hero" aria-label={strings.SIGN_UP_HEADING}>
            <span className="signup-eyebrow">{env.WEBSITE_NAME}</span>
            <h2 className="signup-hero-title">{strings.SIGN_UP_HEADING}</h2>
            <p className="signup-hero-subtitle">{strings.SIGN_UP_MESSAGE}</p>

            <div className="signup-hero-pills">
              <span>
                <VerifiedRoundedIcon />
                {strings.SIGN_UP_HEADING}
              </span>
              <span>
                <DescriptionRoundedIcon />
                {commonStrings.TOS}
              </span>
            </div>

            <div className="signup-hero-visual">
              <div className="signup-feature-card signup-feature-card-primary">
                <span className="signup-feature-label">{env.WEBSITE_NAME}</span>
                <strong>{strings.SIGN_UP_HEADING}</strong>
                <p>{strings.SIGN_UP_MESSAGE}</p>
              </div>

              <div className="signup-feature-card signup-feature-card-secondary">
                <span className="signup-feature-label">Google</span>
                <div className="signup-provider-grid">
                  <span>Google</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </Layout>
  )
}

export default SignUp
