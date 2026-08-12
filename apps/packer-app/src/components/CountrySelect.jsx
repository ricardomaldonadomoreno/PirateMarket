import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown, X, Globe } from 'lucide-react'
import { Country } from 'country-state-city'
import './CountrySelect.css'

/*
  Selector de país usando country-state-city (datos locales, sin API).
  Devuelve: { name, isoCode } o string vacío.
  Props: label, value (nombre del país o ''), onChange(value)
*/

export default function CountrySelect({ label, value, onChange }) {
  const allCountries = useMemo(() => Country.getAllCountries(), [])

  const [input, setInput] = useState(value || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef(null)

  // Sincronizar cuando value cambia desde fuera (loadProfile)
  useEffect(() => {
    setInput(value || '')
  }, [value])

  // Filtrar países
  useEffect(() => {
    if (input.length < 1) {
      setResults([])
      return
    }
    const filtered = allCountries
      .filter(c => c.name.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 10)
    setResults(filtered)
  }, [input])

  const handleSelect = (country) => {
    setInput(country.name)
    setShowDropdown(false)
    onChange(country.name)
  }

  const handleClear = () => {
    setInput('')
    setResults([])
    setShowDropdown(false)
    onChange('')
  }

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const fn = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="country-select-wrapper" ref={wrapperRef}>
      {label && <label className="country-select-label">{label}</label>}
      <div className={`country-select-input-wrap ${showDropdown ? 'active' : ''}`}>
        <Globe size={16} className="country-select-icon" />
        <input
          type="text"
          className="country-select-input"
          value={input}
          onChange={e => { setInput(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Escribe para buscar un país..."
        />
        {input && (
          <button type="button" className="country-select-clear" onClick={handleClear} title="Limpiar">
            <X size={14} />
          </button>
        )}
        <ChevronDown size={14} className="country-select-chevron" />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="country-select-dropdown">
          {results.map(c => (
            <button
              key={c.isoCode}
              type="button"
              className={`country-select-option ${input === c.name ? 'selected' : ''}`}
              onClick={() => handleSelect(c)}
            >
              <span className="country-select-flag">{c.isoCode}</span>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
