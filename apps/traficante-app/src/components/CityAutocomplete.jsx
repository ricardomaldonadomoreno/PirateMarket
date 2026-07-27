import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, MapPin, X } from 'lucide-react'
import './CityAutocomplete.css'

/*
  Autocompletado de ciudades usando Nominatim (OpenStreetMap).
  Debounce 500ms, mínimo 3 caracteres, 1 request/seg.
  Devuelve: { city, country, lat, lng, displayName }

  Props extra para dirección verificada:
  - useVerifiedAddress: bool (mostrar botón)
  - verifiedAddress: { country, city, lat, lng, address }
  - verifiedFieldUsed: string | null — 'origin' o 'destination' si ya se usó en otro campo
  - fieldKey: 'origin' | 'destination' — identificador del campo actual
  - onVerifiedUsed: (fieldKey) => void — notifica al padre que se usó aquí
*/

const DEBOUNCE_MS = 500
const MIN_CHARS = 3

export default function CityAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  useVerifiedAddress,
  verifiedAddress,
  verifiedFieldUsed,
  fieldKey,
  onVerifiedUsed,
}) {
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)
  const wrapperRef = useRef(null)

  // Sincronizar input con value prop
  useEffect(() => {
    if (value?.city && !input) {
      setInput(`${value.city}, ${value.country || ''}`)
    }
  }, []) // eslint-disable-line

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const doSearch = useCallback(async (query) => {
    if (query.length < MIN_CHARS) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=es`
      )
      const data = await res.json()
      setResults(data.map(r => ({
        city: r.address?.city || r.address?.town || r.address?.village || r.name,
        country: r.address?.country,
        country_code: r.address?.country_code?.toUpperCase(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        displayName: r.display_name,
      })))
      setShowDropdown(true)
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    setInput(val)
    setShowDropdown(false)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), DEBOUNCE_MS)
  }

  const selectResult = (r) => {
    setInput(`${r.city}, ${r.country}`)
    onChange({ city: r.city, country: r.country, country_code: r.country_code, lat: r.lat, lng: r.lng, displayName: r.displayName })
    setShowDropdown(false)
  }

  const useVerified = () => {
    if (!verifiedAddress) return
    const v = verifiedAddress
    setInput(`${v.city || ''}, ${v.country || ''}`.trim())
    onChange({ city: v.city, country: v.country, lat: v.lat, lng: v.lng, address: v.address })
    setShowDropdown(false)
    if (onVerifiedUsed && fieldKey) {
      onVerifiedUsed(fieldKey)
    }
  }

  const clear = () => {
    setInput('')
    onChange(null)
    setResults([])
  }

  // Botón disponible solo si no se usó en otro campo
  const verifiedBtnEnabled = useVerifiedAddress && verifiedAddress && verifiedFieldUsed !== fieldKey

  return (
    <div className="ca-wrapper" ref={wrapperRef}>
      <label className="ca-label">{label}</label>
      <div className="ca-input-row">
        <div className="ca-input-container">
          <Search size={13} className="ca-icon" />
          <input
            className="input ca-input"
            type="text"
            placeholder={placeholder}
            value={input}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
          {input && (
            <button type="button" className="ca-clear" onClick={clear}>
              <X size={13} />
            </button>
          )}
          {loading && <span className="ca-loading" />}
        </div>
        {verifiedBtnEnabled && (
          <button type="button" className="ca-use-verified" onClick={useVerified} title="Usar mi dirección oficial">
            <MapPin size={13} />
          </button>
        )}
        {useVerifiedAddress && verifiedAddress && verifiedFieldUsed === fieldKey && (
          <span className="ca-verified-badge" title="Dirección oficial aplicada">
            <MapPin size={13} />
          </span>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <ul className="ca-dropdown">
          {results.map((r, i) => (
            <li key={i} className="ca-dropdown-item" onClick={() => selectResult(r)}>
              <MapPin size={13} className="ca-item-icon" />
              <div className="ca-item-text">
                <span className="ca-item-city">{r.city}</span>
                <span className="ca-item-country">{r.country}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
