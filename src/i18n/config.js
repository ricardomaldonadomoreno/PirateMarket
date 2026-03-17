import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import es from '../locales/es.json'
import en from '../locales/en.json'
import pt from '../locales/pt.json'
import ar from '../locales/ar.json'
import zh from '../locales/zh.json'

const resources = {
  es: { translation: es },
  en: { translation: en },
  pt: { translation: pt },
  ar: { translation: ar },
  zh: { translation: zh }
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
