import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TITLE: 'Documentation utilisateur',
    INTRO: 'Ce guide aide les équipes à utiliser le panneau d\'administration au quotidien.',
    SECTION1_TITLE: '1) Démarrage rapide',
    SECTION1_ITEM1: 'Connectez-vous avec votre compte et vérifiez votre profil.',
    SECTION1_ITEM2: 'Utilisez le menu latéral pour accéder aux réservations, voitures et utilisateurs.',
    SECTION2_TITLE: '2) Gestion opérationnelle',
    SECTION2_ITEM1: 'Créez et mettez à jour les réservations depuis le tableau de bord.',
    SECTION2_ITEM2: 'Ajoutez des voitures, des disponibilités et des règles tarifaires.',
    SECTION3_TITLE: '3) Bonnes pratiques',
    SECTION3_ITEM1: 'Gardez les profils fournisseurs et conducteurs à jour.',
    SECTION3_ITEM2: 'Activez les notifications pour suivre les actions importantes.',
  },
  en: {
    TITLE: 'User Manual',
    INTRO: 'This manual helps teams use the admin panel for daily operations.',
    SECTION1_TITLE: '1) Quick start',
    SECTION1_ITEM1: 'Sign in with your account and verify your profile details.',
    SECTION1_ITEM2: 'Use the side menu to access bookings, cars, and users.',
    SECTION2_TITLE: '2) Operations management',
    SECTION2_ITEM1: 'Create and update bookings from the dashboard.',
    SECTION2_ITEM2: 'Add cars, availability windows, and pricing rules.',
    SECTION3_TITLE: '3) Best practices',
    SECTION3_ITEM1: 'Keep supplier and driver profiles up to date.',
    SECTION3_ITEM2: 'Enable notifications to follow important actions.',
  },
  ar: {
    TITLE: 'دليل الاستخدام',
    INTRO: 'يساعد هذا الدليل الفرق على استخدام لوحة الإدارة في العمليات اليومية.',
    SECTION1_TITLE: '1) البدء السريع',
    SECTION1_ITEM1: 'سجل الدخول بحسابك وتأكد من بيانات ملفك الشخصي.',
    SECTION1_ITEM2: 'استخدم القائمة الجانبية للوصول إلى الحجوزات والسيارات والمستخدمين.',
    SECTION2_TITLE: '2) إدارة العمليات',
    SECTION2_ITEM1: 'أنشئ الحجوزات وحدّثها من لوحة التحكم.',
    SECTION2_ITEM2: 'أضف السيارات وفترات التوفر وقواعد التسعير.',
    SECTION3_TITLE: '3) أفضل الممارسات',
    SECTION3_ITEM1: 'حافظ على تحديث ملفات الموردين والسائقين باستمرار.',
    SECTION3_ITEM2: 'فعّل الإشعارات لمتابعة الإجراءات المهمة.',
  },
  es: {
    TITLE: 'Manual de usuario',
    INTRO: 'Este manual ayuda a los equipos a usar el panel de administración en las operaciones diarias.',
    SECTION1_TITLE: '1) Inicio rápido',
    SECTION1_ITEM1: 'Inicia sesión con tu cuenta y verifica los datos de tu perfil.',
    SECTION1_ITEM2: 'Usa el menú lateral para acceder a reservas, coches y usuarios.',
    SECTION2_TITLE: '2) Gestión operativa',
    SECTION2_ITEM1: 'Crea y actualiza reservas desde el panel principal.',
    SECTION2_ITEM2: 'Agrega coches, ventanas de disponibilidad y reglas de precios.',
    SECTION3_TITLE: '3) Buenas prácticas',
    SECTION3_ITEM1: 'Mantén actualizados los perfiles de proveedores y conductores.',
    SECTION3_ITEM2: 'Activa notificaciones para seguir acciones importantes.',
  },
})

langHelper.setLanguage(strings)
export { strings }
