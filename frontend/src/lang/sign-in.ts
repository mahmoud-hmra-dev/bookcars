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
    AUTH0_CONTINUE: 'Continuer avec Auth0',
    AUTH0_SIGN_IN_MESSAGE: 'Connectez-vous via Auth0 pour continuer en toute securite.',
    AUTH0_SIGN_IN_ERROR: 'La connexion Auth0 a echoue.',
    AUTH0_REDIRECTING: 'Redirection vers Auth0...',
  },
  en: {
    SIGN_IN_HEADING: 'Sign in',
    SIGN_IN: 'Sign in',
    ERROR_IN_SIGN_IN: 'Incorrect email or password.',
    IS_BLACKLISTED: 'Your account is suspended.',
    RESET_PASSWORD: 'Forgot password?',
    STAY_CONNECTED: 'Stay connected',
    AUTH0_CONTINUE: 'Continue with Auth0',
    AUTH0_SIGN_IN_MESSAGE: 'Sign in securely with Auth0 to continue.',
    AUTH0_SIGN_IN_ERROR: 'Auth0 sign-in failed.',
    AUTH0_REDIRECTING: 'Redirecting to Auth0...',
  },
  ar: {
    SIGN_IN_HEADING: 'تسجيل الدخول',
    SIGN_IN: 'تسجيل الدخول',
    ERROR_IN_SIGN_IN: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    IS_BLACKLISTED: 'تم تعليق حسابك.',
    RESET_PASSWORD: 'هل نسيت كلمة المرور؟',
    STAY_CONNECTED: 'البقاء متصلًا',
    AUTH0_CONTINUE: 'المتابعة باستخدام Auth0',
    AUTH0_SIGN_IN_MESSAGE: 'سجّل الدخول بأمان عبر Auth0 للمتابعة.',
    AUTH0_SIGN_IN_ERROR: 'فشل تسجيل الدخول عبر Auth0.',
    AUTH0_REDIRECTING: 'جارٍ التحويل إلى Auth0...',
  },
  es: {
    SIGN_IN_HEADING: 'Iniciar sesion',
    SIGN_IN: 'Iniciar sesion',
    ERROR_IN_SIGN_IN: 'Correo electronico o contrasena incorrectos.',
    IS_BLACKLISTED: 'Su cuenta esta suspendida.',
    RESET_PASSWORD: 'Olvido su contrasena?',
    STAY_CONNECTED: 'Mantengase conectado',
    AUTH0_CONTINUE: 'Continuar con Auth0',
    AUTH0_SIGN_IN_MESSAGE: 'Inicie sesion de forma segura con Auth0 para continuar.',
    AUTH0_SIGN_IN_ERROR: 'Error al iniciar sesion con Auth0.',
    AUTH0_REDIRECTING: 'Redirigiendo a Auth0...',
  },
})

langHelper.setLanguage(strings)
export { strings }
