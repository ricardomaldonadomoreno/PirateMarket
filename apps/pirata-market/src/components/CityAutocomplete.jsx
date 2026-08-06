import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, MapPin, X, ChevronDown } from 'lucide-react'
import { Country, State, City } from 'country-state-city'
import './CityAutocomplete.css'
/*
  Selector jerárquico de ubicación: País → Departamento/Estado → Ciudad.
  Usa country-state-city (datos locales, sin API, sin rate limits).
  Devuelve: { city, country, country_code, state, state_code, lat, lng, displayName }
  Manteniendo la misma API de props: label, placeholder, value, onChange
*/

export default function CityAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
}) {
  const allCountries = useMemo(() => Country.getAllCountries(), [])

  // Filtro de países
  const [countryInput, setCountryInput] = useState('')
  const [countryResults, setCountryResults] = useState([])
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(null)

  // Filtro de estados
  const [stateInput, setStateInput] = useState('')
  const [stateResults, setStateResults] = useState([])
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [selectedState, setSelectedState] = useState(null)

  // Filtro de ciudades
  const [cityInput, setCityInput] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  const wrapperRef = useRef(null)

  // Sincronizar desde value (cuando viene de loadProfile)
  useEffect(() => {
    if (value?.city && !selectedCountry) {
      // Buscar país por nombre
      const country = allCountries.find(c => c.name === value.country) || allCountries.find(c => c.name.toLowerCase().includes(value.country?.toLowerCase()))
      if (country) {
        setSelectedCountry(country)
        setCountryInput(country.name)
        const states = State.getStatesOfCountry(country.isoCode)
        // Buscar estado por ciudad
        for (const s of states) {
          const cities = City.getCitiesOfState(country.isoCode, s.isoCode)
          if (cities.find(c => c.name === value.city)) {
            setSelectedState(s)
            setStateInput(s.name)
            setCityInput(value.city)
            break
          }
        }
      } else if (value.country) {
        setCountryInput(value.country)
        setCityInput(value.city)
      }
    }
  }, [value]) // eslint-disable-line

  // Cerrar dropdowns al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowCountryDropdown(false)
        setShowStateDropdown(false)
        setShowCityDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Al cambiar país seleccionado
  useEffect(() => {
    if (selectedCountry) {
      const states = State.getStatesOfCountry(selectedCountry.isoCode)
      setStateResults(states)
      setStateInput('')
      setSelectedState(null)
      setCityInput('')
      setCityResults([])
    } else {
      setStateResults([])
      setStateInput('')
      setSelectedState(null)
      setCityInput('')
      setCityResults([])
    }
  }, [selectedCountry])

  // Al cambiar estado seleccionado
  useEffect(() => {
    if (selectedState && selectedCountry) {
      const cities = City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
      setCityResults(cities)
      setCityInput('')
      setShowCityDropdown(true)
    } else {
      setCityResults([])
      setCityInput('')
    }
  }, [selectedState, selectedCountry])

  // Filtrar países al escribir
  const handleCountryInput = (e) => {
    const val = e.target.value
    setCountryInput(val)
    setSelectedCountry(null)
    setSelectedState(null)
    setCityInput('')
    onChange(null)
    if (val.length < 1) {
      setCountryResults([])
      setShowCountryDropdown(false)
      return
    }
    const filtered = allCountries.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 15)
    setCountryResults(filtered)
    setShowCountryDropdown(true)
  }

  // Filtrar estados al escribir
  const handleStateInput = (e) => {
    const val = e.target.value
    setStateInput(val)
    setSelectedState(null)
    setCityInput('')
    onChange(null)
    if (!selectedCountry) return
    const states = State.getStatesOfCountry(selectedCountry.isoCode)
    if (val.length < 1) {
      setStateResults(states)
      setShowStateDropdown(true)
      return
    }
    const filtered = states.filter(s =>
      s.name.toLowerCase().includes(val.toLowerCase())
    )
    setStateResults(filtered)
    setShowStateDropdown(true)
  }

  // Filtrar ciudades al escribir
  const handleCityInput = (e) => {
    const val = e.target.value
    setCityInput(val)
    if (!selectedState || !selectedCountry) return
    const cities = City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
    if (val.length < 1) {
      setCityResults(cities)
      setShowCityDropdown(true)
      return
    }
    const filtered = cities.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase())
    )
    setCityResults(filtered)
    setShowCityDropdown(true)
  }

  const selectCountry = (c) => {
    setSelectedCountry(c)
    setCountryInput(c.name)
    setShowCountryDropdown(false)
    onChange(null)
  }

  const selectState = (s) => {
    setSelectedState(s)
    setStateInput(s.name)
    setShowStateDropdown(false)
    onChange(null)
  }

  const selectCity = (c) => {
    setCityInput(c.name)
    setShowCityDropdown(false)
    const result = {
      city: c.name,
      country: selectedCountry.name,
      country_code: selectedCountry.isoCode,
      state: selectedState ? selectedState.name : null,
      state_code: selectedState ? selectedState.isoCode : null,
      lat: parseFloat(c.latitude),
      lng: parseFloat(c.longitude),
    }
    onChange(result)
  }

  const clear = () => {
    setCountryInput('')
    setStateInput('')
    setCityInput('')
    setSelectedCountry(null)
    setSelectedState(null)
    setCountryResults([])
    setStateResults([])
    setCityResults([])
    onChange(null)
  }

  return (
    <div className="ca-wrapper" ref={wrapperRef}>
      {/* País */}
      <div className="ca-input-container">
        <label className="ca-label">País</label>
        <Search size={13} className="ca-icon" />
        <input
          className="input ca-input"
          type="text"
          placeholder="País"
          value={countryInput}
          onChange={handleCountryInput}
          onFocus={() => !disabled && countryInput.length >= 1 && setShowCountryDropdown(true)}
          readOnly={!!selectedCountry && !showCountryDropdown || disabled}
          disabled={disabled}
        />
        {selectedCountry && !showCountryDropdown && !disabled && (
          <button type="button" className="ca-clear" onClick={() => { setSelectedCountry(null); setCountryInput(''); setStateInput(''); setCityInput(''); setSelectedState(null); onChange(null) }}>
            <X size={13} />
          </button>
        )}
        {showCountryDropdown && countryResults.length > 0 && (
          <ul className="ca-dropdown">
            {countryResults.map((c, i) => (
              <li key={`${c.isoCode}-${i}`} className="ca-dropdown-item" onClick={() => selectCountry(c)}>
                <MapPin size={13} className="ca-item-icon" />
                <div className="ca-item-text">
                  <span className="ca-item-city">{c.name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Departamento/Estado */}
      {selectedCountry && (
        <div className="ca-input-container">
          <label className="ca-label">Departamento / Estado</label>
          <ChevronDown size={13} className="ca-icon" />
          <input
            className="input ca-input"
            type="text"
            placeholder="Departamento / Estado"
            value={stateInput}
            onChange={handleStateInput}
            onFocus={() => !disabled && setShowStateDropdown(true)}
            readOnly={!!selectedState && !showStateDropdown || disabled}
            disabled={disabled}
          />
          {selectedState && !showStateDropdown && !disabled && (
            <button type="button" className="ca-clear" onClick={() => { setSelectedState(null); setStateInput(''); setCityInput(''); onChange(null) }}>
              <X size={13} />
            </button>
          )}
          {showStateDropdown && stateResults.length > 0 && (
            <ul className="ca-dropdown">
              {stateResults.slice(0, 20).map((s, i) => (
                <li key={`${s.isoCode}-${i}`} className="ca-dropdown-item" onClick={() => selectState(s)}>
                  <MapPin size={13} className="ca-item-icon" />
                  <div className="ca-item-text">
                    <span className="ca-item-city">{s.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Ciudad */}
      {selectedState && (
        <div className="ca-input-container">
          <label className="ca-label">Ciudad</label>
          <Search size={13} className="ca-icon" />
          <input
            className="input ca-input"
            type="text"
            placeholder="Ciudad"
            value={cityInput}
            onChange={handleCityInput}
            onFocus={() => !disabled && cityInput.length >= 1 && setShowCityDropdown(true)}
            readOnly={!!value && value.city && !showCityDropdown || disabled}
            disabled={disabled}
          />
          {value?.city && !showCityDropdown && !disabled && (
            <button type="button" className="ca-clear" onClick={clear}>
              <X size={13} />
            </button>
          )}
        </div>
      )}
      {showCityDropdown && cityResults.length > 0 && (
        <ul className="ca-dropdown">
          {cityResults.slice(0, 15).map((c, i) => (
            <li key={`${c.stateCode}-${c.name}-${i}`} className="ca-dropdown-item" onClick={() => selectCity(c)}>
              <MapPin size={13} className="ca-item-icon" />
              <div className="ca-item-text">
                <span className="ca-item-city">{c.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
