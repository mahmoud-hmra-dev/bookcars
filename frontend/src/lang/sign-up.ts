import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_UP_HEADING: 'Inscription',
    SIGN_UP: "S'inscrire",
    SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription.",
    AUTH0_CREATE_ACCOUNT: 'Creer un compte avec Auth0',
    AUTH0_SIGN_UP_MESSAGE: 'Creez votre compte avec Auth0 puis completez votre profil dans l application.',
    AUTH0_SIGN_UP_ERROR: "L'inscription Auth0 a echoue.",
    AUTH0_REDIRECTING: 'Redirection vers Auth0...',
    GO_TO_SIGN_IN: 'Aller a la connexion',
  },
  en: {
    SIGN_UP_HEADING: 'Register',
    SIGN_UP: 'Register',
    SIGN_UP_ERROR: 'An error occurred during sign up.',
    AUTH0_CREATE_ACCOUNT: 'Create account with Auth0',
    AUTH0_SIGN_UP_MESSAGE: 'Create your account with Auth0, then complete your profile inside the app.',
    AUTH0_SIGN_UP_ERROR: 'Auth0 sign-up failed.',
    AUTH0_REDIRECTING: 'Redirecting to Auth0...',
    GO_TO_SIGN_IN: 'Go to sign in',
  },
  ar: {
    SIGN_UP_HEADING: 'إنشاء حساب',
    SIGN_UP: 'إنشاء حساب',
    SIGN_UP_ERROR: 'حدث خطأ أثناء إنشاء الحساب.',
    AUTH0_CREATE_ACCOUNT: 'إنشاء حساب عبر Auth0',
    AUTH0_SIGN_UP_MESSAGE: 'أنشئ حسابك عبر Auth0 ثم أكمل ملفك الشخصي داخل التطبيق.',
    AUTH0_SIGN_UP_ERROR: 'فشل إنشاء الحساب عبر Auth0.',
    AUTH0_REDIRECTING: 'جارٍ التحويل إلى Auth0...',
    GO_TO_SIGN_IN: 'الانتقال إلى تسجيل الدخول',
  },
  es: {
    SIGN_UP_HEADING: 'Registrate',
    SIGN_UP: 'Registrate',
    SIGN_UP_ERROR: 'Se produjo un error durante el registro.',
    AUTH0_CREATE_ACCOUNT: 'Crear cuenta con Auth0',
    AUTH0_SIGN_UP_MESSAGE: 'Cree su cuenta con Auth0 y luego complete su perfil dentro de la aplicacion.',
    AUTH0_SIGN_UP_ERROR: 'El registro con Auth0 ha fallado.',
    AUTH0_REDIRECTING: 'Redirigiendo a Auth0...',
    GO_TO_SIGN_IN: 'Ir a iniciar sesion',
  },
})

langHelper.setLanguage(strings)
export { strings }
