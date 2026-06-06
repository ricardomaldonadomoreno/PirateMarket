import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Pirata Market translations
import es from '../locales/es.json'
import en from '../locales/en.json'
import pt from '../locales/pt.json'
import ar from '../locales/ar.json'
import zh from '../locales/zh.json'

// Traficante translations
import trafEs from '../../../traficante-app/src/locales/es.json'
import trafEn from '../../../traficante-app/src/locales/en.json'

const resources = {
  es: { translation: es, traficante: trafEs },
  en: { translation: en, traficante: trafEn },
  pt: { translation: pt, traficante: trafEs },
  ar: { translation: ar, traficante: trafEs },
  zh: { translation: zh, traficante: trafEs }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'pt', 'ar', 'zh'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

// Handle RTL for Arabic
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
})

export default i18n
