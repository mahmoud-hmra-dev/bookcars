import { I18n } from 'i18n-js'
import { en } from './en'
import { ar } from './ar'
import { fr } from './fr'
import { es } from './es'

const i18n = new I18n({ en, ar, fr, es })
i18n.enableFallback = true
export default i18n
