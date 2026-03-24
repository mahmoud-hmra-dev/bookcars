import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  en: {
    TITLE: 'Operations Assistant',
    SUBTITLE: 'A professional admin copilot built around BookCars operational data.',
    CHAT_HELPER: 'Use it for dashboards, searches, risk review, and action drafts.',
    INPUT_LABEL: 'Message',
    INPUT_PLACEHOLDER: 'Ask for dashboard overview, fleet overview, supplier search, or a draft action…',
    EXAMPLES_TITLE: 'Quick prompts',
    YOU: 'You',
    ASSISTANT: 'Assistant',
    INTENT: 'Intent',
    STATUS: 'Status',
    SUGGESTED_ACTIONS: 'Suggestions',
    THINKING: 'Analyzing request...',
    TRANSCRIBING: 'Transcribing audio...',
    VOICE_TRANSCRIPT: 'Voice transcript',
    VOICE_ERROR: 'Voice request failed. Try a shorter recording.',
    MIC_PERMISSION_ERROR: 'Microphone access failed.',
    RETRY: 'Please try again.',
    RESULT: 'Result',
    NO_RESULT: 'No data.',
    COPY: 'Copy',
    USE_IN_COMPOSER: 'Use in composer',
  },
  ar: {
    TITLE: 'مساعد العمليات',
    SUBTITLE: 'مساعد احترافي للإدارة مبني على بيانات BookCars التشغيلية.',
    CHAT_HELPER: 'استخدمه للوحة الملخصات، البحث، مراجعة المخاطر، وتجهيز الإجراءات.',
    INPUT_LABEL: 'الرسالة',
    INPUT_PLACEHOLDER: 'اطلب ملخص اللوحة أو الأسطول أو ابحث عن مورد أو جهّز إجراء…',
    EXAMPLES_TITLE: 'أوامر سريعة',
    YOU: 'أنت',
    ASSISTANT: 'المساعد',
    INTENT: 'النية',
    STATUS: 'الحالة',
    SUGGESTED_ACTIONS: 'اقتراحات',
    THINKING: 'جارٍ تحليل الطلب...',
    TRANSCRIBING: 'جارٍ تفريغ الصوت...',
    VOICE_TRANSCRIPT: 'النص الصوتي',
    VOICE_ERROR: 'فشل طلب الصوت. جرّب تسجيلًا أقصر.',
    MIC_PERMISSION_ERROR: 'فشل الوصول إلى الميكروفون.',
    RETRY: 'حاول مرة أخرى.',
    RESULT: 'النتيجة',
    NO_RESULT: 'لا توجد بيانات.',
    COPY: 'نسخ',
    USE_IN_COMPOSER: 'استخدم في مربع الكتابة',
  },
})

langHelper.setLanguage(strings)
export { strings }
