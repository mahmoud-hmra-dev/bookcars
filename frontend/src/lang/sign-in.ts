import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_IN_HEADING: 'Connexion',
    SIGN_IN: 'Se connecter',
    ERROR_IN_SIGN_IN: 'E-mail ou mot de passe incorrect.',
    IS_BLACKLISTED: 'Votre compte est suspendu.',
    RESET_PASSWORD: 'Mot de passe oublie ?',
    STAY_CONNECTED: 'Rester connecte',
    SIGN_IN_MESSAGE: 'Connectez-vous pour continuer.',
  },
  en: {
    SIGN_IN_HEADING: 'Sign in',
    SIGN_IN: 'Sign in',
    ERROR_IN_SIGN_IN: 'Incorrect email or password.',
    IS_BLACKLISTED: 'Your account is suspended.',
    RESET_PASSWORD: 'Forgot password?',
    STAY_CONNECTED: 'Stay connected',
    SIGN_IN_MESSAGE: 'Sign in to continue.',
  },
  ar: {
    SIGN_IN_HEADING: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„',
    SIGN_IN: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„',
    ERROR_IN_SIGN_IN: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø£Ùˆ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©.',
    IS_BLACKLISTED: 'ØªÙ… ØªØ¹Ù„ÙŠÙ‚ Ø­Ø³Ø§Ø¨Ùƒ.',
    RESET_PASSWORD: 'Ù‡Ù„ Ù†Ø³ÙŠØª ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±ØŸ',
    STAY_CONNECTED: 'Ø§Ù„Ø¨Ù‚Ø§Ø¡ Ù…ØªØµÙ„Ù‹Ø§',
    SIGN_IN_MESSAGE: 'Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø©.',
  },
  es: {
    SIGN_IN_HEADING: 'Iniciar sesion',
    SIGN_IN: 'Iniciar sesion',
    ERROR_IN_SIGN_IN: 'Correo electronico o contrasena incorrectos.',
    IS_BLACKLISTED: 'Su cuenta esta suspendida.',
    RESET_PASSWORD: 'Olvido su contrasena?',
    STAY_CONNECTED: 'Mantengase conectado',
    SIGN_IN_MESSAGE: 'Inicie sesion para continuar.',
  },
})

langHelper.setLanguage(strings)
export { strings }
