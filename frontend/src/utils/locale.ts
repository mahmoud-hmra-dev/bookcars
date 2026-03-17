import { arSA, enUS, es, fr } from 'date-fns/locale'
import { arSA as coreArSA, enUS as coreEnUS, esES as coreEsES, frFR as coreFrFR } from '@mui/material/locale'
import { arSD as dataGridArSD, enUS as dataGridEnUS, esES as dataGridEsES, frFR as dataGridFrFR } from '@mui/x-data-grid/locales'
import { enUS as pickersEnUS, esES as pickersEsES, frFR as pickersFrFR } from '@mui/x-date-pickers/locales'

const pickersAr = {
  components: {
    MuiLocalizationProvider: {
      defaultProps: {
        localeText: {
          previousMonth: 'الشهر السابق',
          nextMonth: 'الشهر التالي',
          openPreviousView: 'افتح العرض السابق',
          openNextView: 'افتح العرض التالي',
          calendarViewSwitchingButtonAriaLabel: (view: string) => (view === 'year'
            ? 'عرض السنة مفتوح، انتقل إلى عرض التقويم'
            : 'عرض التقويم مفتوح، انتقل إلى عرض السنة'),
          start: 'البداية',
          end: 'النهاية',
          startDate: 'تاريخ البداية',
          startTime: 'وقت البداية',
          endDate: 'تاريخ النهاية',
          endTime: 'وقت النهاية',
          cancelButtonLabel: 'إلغاء',
          clearButtonLabel: 'مسح',
          okButtonLabel: 'موافق',
          todayButtonLabel: 'اليوم',
          nextStepButtonLabel: 'التالي',
          datePickerToolbarTitle: 'اختر التاريخ',
          dateTimePickerToolbarTitle: 'اختر التاريخ والوقت',
          timePickerToolbarTitle: 'اختر الوقت',
          dateRangePickerToolbarTitle: 'اختر نطاق التاريخ',
          timeRangePickerToolbarTitle: 'اختر نطاق الوقت',
          clockLabelText: (view: string, formattedTime: string) => `اختر ${view}. ${formattedTime ? `الوقت المحدد هو ${formattedTime}` : 'لم يتم تحديد وقت'}`,
          hoursClockNumberText: (hours: number) => `${hours} ساعة`,
          minutesClockNumberText: (minutes: number) => `${minutes} دقيقة`,
          secondsClockNumberText: (seconds: number) => `${seconds} ثانية`,
          selectViewText: (view: string) => `اختر ${view}`,
          calendarWeekNumberHeaderLabel: 'رقم الأسبوع',
          calendarWeekNumberHeaderText: '#',
          calendarWeekNumberAriaLabelText: (weekNumber: number) => `الأسبوع ${weekNumber}`,
          calendarWeekNumberText: (weekNumber: number) => `${weekNumber}`,
          openDatePickerDialogue: (formattedDate: string) => (formattedDate ? `اختر التاريخ، التاريخ المحدد هو ${formattedDate}` : 'اختر التاريخ'),
          openTimePickerDialogue: (formattedTime: string) => (formattedTime ? `اختر الوقت، الوقت المحدد هو ${formattedTime}` : 'اختر الوقت'),
          openRangePickerDialogue: (formattedRange: string) => (formattedRange ? `اختر النطاق، النطاق المحدد هو ${formattedRange}` : 'اختر النطاق'),
          fieldClearLabel: 'مسح',
          timeTableLabel: 'اختر الوقت',
          dateTableLabel: 'اختر التاريخ',
          fieldYearPlaceholder: (params: { digitAmount: number }) => 'س'.repeat(params.digitAmount),
          fieldMonthPlaceholder: (params: { contentType: string }) => (params.contentType === 'letter' ? 'MMMM' : 'MM'),
          fieldDayPlaceholder: () => 'DD',
          fieldWeekDayPlaceholder: (params: { contentType: string }) => (params.contentType === 'letter' ? 'EEEE' : 'EE'),
          fieldHoursPlaceholder: () => 'hh',
          fieldMinutesPlaceholder: () => 'mm',
          fieldSecondsPlaceholder: () => 'ss',
          fieldMeridiemPlaceholder: () => 'aa',
          year: 'السنة',
          month: 'الشهر',
          day: 'اليوم',
          weekDay: 'اليوم',
          hours: 'الساعات',
          minutes: 'الدقائق',
          seconds: 'الثواني',
          meridiem: 'الفترة',
          empty: 'فارغ',
        },
      },
    },
  },
}

export const isRTL = (language: string) => language === 'ar'

export const getDirection = (language: string) => (isRTL(language) ? 'rtl' : 'ltr')

export const getDateFnsLocale = (language?: string) => {
  switch (language) {
    case 'fr':
      return fr
    case 'es':
      return es
    case 'ar':
      return arSA
    default:
      return enUS
  }
}

export const getMuiCoreLocale = (language: string) => {
  switch (language) {
    case 'fr':
      return coreFrFR
    case 'es':
      return coreEsES
    case 'ar':
      return coreArSA
    default:
      return coreEnUS
  }
}

export const getMuiDatePickersLocale = (language: string) => {
  switch (language) {
    case 'fr':
      return pickersFrFR
    case 'es':
      return pickersEsES
    case 'ar':
      return pickersAr
    default:
      return pickersEnUS
  }
}

export const getMuiDataGridLocale = (language: string) => {
  switch (language) {
    case 'fr':
      return dataGridFrFR
    case 'es':
      return dataGridEsES
    case 'ar':
      return dataGridArSD
    default:
      return dataGridEnUS
  }
}

export const applyDocumentLanguage = (language: string) => {
  if (typeof document === 'undefined') {
    return
  }

  const direction = getDirection(language)
  document.documentElement.lang = language
  document.documentElement.dir = direction
  document.body.setAttribute('dir', direction)
}
