import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CONGRATULATIONS: 'Felicitations!',
    SUCCESS: 'Votre paiement a ete effectue avec succes.',
    SUCCESS_PAY_LATER: 'Votre reservation a ete effectuee avec succes.',
    ERROR: 'Something went wrong! Try again later',
    GO_TO_BOOKINGS: 'Voir mes reservations',
  },
  en: {
    CONGRATULATIONS: 'Congratulations!',
    SUCCESS: 'Your payment was successfully done.',
    SUCCESS_PAY_LATER: 'Your booking was successfully done.',
    ERROR: 'Something went wrong! Try again later',
    GO_TO_BOOKINGS: 'Go to bookings',
  },
  ar: {
    CONGRATULATIONS: 'ØªÙ‡Ø§Ù†ÙŠÙ†Ø§!',
    SUCCESS: 'ØªÙ…Øª Ø¹Ù…Ù„ÙŠØ© Ø§Ù„Ø¯ÙØ¹ Ø¨Ù†Ø¬Ø§Ø­.',
    SUCCESS_PAY_LATER: 'ØªÙ… Ø¥ØªÙ…Ø§Ù… Ø­Ø¬Ø²Ùƒ Ø¨Ù†Ø¬Ø§Ø­.',
    ERROR: 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ù…Ø§. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ù„Ø§Ø­Ù‚Ù‹Ø§.',
    GO_TO_BOOKINGS: 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª',
  },
  es: {
    CONGRATULATIONS: 'Felicitaciones!',
    SUCCESS: 'Tu pago se realizo con exito.',
    SUCCESS_PAY_LATER: 'Tu reserva se ha realizado con exito.',
    ERROR: 'Algo salio mal. Intentalo de nuevo mas tarde',
    GO_TO_BOOKINGS: 'Ir a reservas',
  },
})

langHelper.setLanguage(strings)
export { strings }
