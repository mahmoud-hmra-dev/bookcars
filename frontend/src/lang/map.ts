import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SELECT_PICK_UP_LOCATION: 'Choisir ce lieu',
    SELECT_DROP_OFF_LOCATION: 'Choisir comme lieu de restitution',
  },
  en: {
    SELECT_PICK_UP_LOCATION: 'Select Location',
    SELECT_DROP_OFF_LOCATION: 'Set as Drop-off Location',
  },
  ar: {
    SELECT_PICK_UP_LOCATION: 'اختر الموقع',
    SELECT_DROP_OFF_LOCATION: 'تحديده كمكان للتسليم',
  },
  es: {
    SELECT_PICK_UP_LOCATION: 'Seleccionar ubicación',
    SELECT_DROP_OFF_LOCATION: 'Establecer como ubicación de entrega',
  },
})

langHelper.setLanguage(strings)
export { strings }
