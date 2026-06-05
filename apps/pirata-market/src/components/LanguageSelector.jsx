import { useTranslation } from 'react-i18next'
import './LanguageSelector.css'

const languages = [
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'pt', flag: '🇧🇷', name: 'Português' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'zh', flag: '🇨🇳', name: '中文' }
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
  }

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0]

  return (
    <div className="language-selector">
      <button className="language-button">
        <span className="language-flag">{currentLang.flag}</span>
        <span className="language-code">{currentLang.code.toUpperCase()}</span>
      </button>
      
      <div className="language-dropdown">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
          >
            <span className="language-flag">{lang.flag}</span>
            <span className="language-name">{lang.name}</span>
            {i18n.language === lang.code && (
              <span className="language-check">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
