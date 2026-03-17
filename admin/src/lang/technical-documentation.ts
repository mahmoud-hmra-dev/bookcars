import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TITLE: 'Documentation technique',
    INTRO: 'Réservée aux administrateurs: architecture, sécurité et exploitation.',
    SECTION1_TITLE: '1) Architecture',
    SECTION1_ITEM1: 'Frontend/Admin: React + Vite.',
    SECTION1_ITEM2: 'Backend: API Node.js avec services métier.',
    SECTION2_TITLE: '2) Configuration',
    SECTION2_ITEM1: 'Les variables d\'environnement contrôlent les modules externes.',
    SECTION2_ITEM2: 'Les langues prises en charge sont synchronisées dans la configuration.',
    SECTION3_TITLE: '3) Sécurité et maintenance',
    SECTION3_ITEM1: 'Appliquez les permissions par rôle (admin, fournisseur, utilisateur).',
    SECTION3_ITEM2: 'Surveillez les logs, notifications et tâches planifiées.',
  },
  en: {
    TITLE: 'Technical Documentation',
    INTRO: 'Admin-only reference for architecture, security, and operations.',
    SECTION1_TITLE: '1) Architecture',
    SECTION1_ITEM1: 'Frontend/Admin: React + Vite applications.',
    SECTION1_ITEM2: 'Backend: Node.js API with service-oriented modules.',
    SECTION2_TITLE: '2) Configuration',
    SECTION2_ITEM1: 'Environment variables control third-party integrations.',
    SECTION2_ITEM2: 'Supported languages are synchronized through app configuration.',
    SECTION3_TITLE: '3) Security and maintenance',
    SECTION3_ITEM1: 'Enforce role-based permissions (admin, supplier, user).',
    SECTION3_ITEM2: 'Monitor logs, notifications, and scheduled tasks.',
  },
  ar: {
    TITLE: 'التوثيق التقني',
    INTRO: 'مرجع مخصص للمشرفين فقط حول البنية والأمان والتشغيل.',
    SECTION1_TITLE: '1) البنية',
    SECTION1_ITEM1: 'الواجهة ولوحة الإدارة: تطبيقات React + Vite.',
    SECTION1_ITEM2: 'الخلفية: واجهة Node.js مع وحدات خدمية.',
    SECTION2_TITLE: '2) الإعدادات',
    SECTION2_ITEM1: 'متغيرات البيئة تتحكم في التكاملات الخارجية.',
    SECTION2_ITEM2: 'اللغات المدعومة تتم مزامنتها عبر إعدادات التطبيق.',
    SECTION3_TITLE: '3) الأمان والصيانة',
    SECTION3_ITEM1: 'تطبيق صلاحيات مبنية على الأدوار (مشرف، مورد، مستخدم).',
    SECTION3_ITEM2: 'مراقبة السجلات والإشعارات والمهام المجدولة.',
  },
  es: {
    TITLE: 'Documentación técnica',
    INTRO: 'Referencia solo para administradores sobre arquitectura, seguridad y operación.',
    SECTION1_TITLE: '1) Arquitectura',
    SECTION1_ITEM1: 'Frontend/Admin: aplicaciones React + Vite.',
    SECTION1_ITEM2: 'Backend: API Node.js con módulos orientados a servicios.',
    SECTION2_TITLE: '2) Configuración',
    SECTION2_ITEM1: 'Las variables de entorno controlan integraciones externas.',
    SECTION2_ITEM2: 'Los idiomas soportados se sincronizan mediante la configuración.',
    SECTION3_TITLE: '3) Seguridad y mantenimiento',
    SECTION3_ITEM1: 'Aplicar permisos por rol (admin, proveedor, usuario).',
    SECTION3_ITEM2: 'Monitorear logs, notificaciones y tareas programadas.',
  },
})

langHelper.setLanguage(strings)
export { strings }
