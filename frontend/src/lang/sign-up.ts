import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_UP_HEADING: 'Inscription',
    SIGN_UP: "S'inscrire",
    SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription.",
    SIGN_UP_MESSAGE: 'Creez votre compte pour commencer.',
    GO_TO_SIGN_IN: 'Aller a la connexion',
    SIGN_UP_SUCCESS: 'Un e-mail de confirmation vous a ete envoye.',
  },
  en: {
    SIGN_UP_HEADING: 'Register',
    SIGN_UP: 'Register',
    SIGN_UP_ERROR: 'An error occurred during sign up.',
    SIGN_UP_MESSAGE: 'Create your account to get started.',
    GO_TO_SIGN_IN: 'Go to sign in',
    SIGN_UP_SUCCESS: 'A confirmation email has been sent to you.',
  },
  ar: {
    SIGN_UP_HEADING: 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨',
    SIGN_UP: 'Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨',
    SIGN_UP_ERROR: 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨.',
    SIGN_UP_MESSAGE: 'Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨Ùƒ Ù„Ù„Ø¨Ø¯Ø¡.',
    GO_TO_SIGN_IN: 'Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ø¥Ù„Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„',
    SIGN_UP_SUCCESS: 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¨Ø±ÙŠØ¯ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù„Ù„ØªØ£ÙƒÙŠØ¯.',
  },
  es: {
    SIGN_UP_HEADING: 'Registrate',
    SIGN_UP: 'Registrate',
    SIGN_UP_ERROR: 'Se produjo un error durante el registro.',
    SIGN_UP_MESSAGE: 'Cree su cuenta para comenzar.',
    GO_TO_SIGN_IN: 'Ir a iniciar sesion',
    SIGN_UP_SUCCESS: 'Se le ha enviado un correo electronico de confirmacion.',
  },
})

langHelper.setLanguage(strings)
export { strings }
