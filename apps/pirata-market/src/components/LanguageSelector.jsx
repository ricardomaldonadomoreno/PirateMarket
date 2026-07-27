import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import './LanguageSelector.css'

const languages = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
  { code: 'zh', name: '中文' }
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
    setOpen(false)
  }

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0]

  return (
    <div className="language-selector">
      <button
        className="language-button"
        onClick={() => setOpen(!open)}
        aria-label="Idioma"
      >
        <Globe size={16} />
      </button>

      {open && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
            >
              <span className="language-name">{lang.name}</span>
              {i18n.language === lang.code && (
                <Check size={14} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
