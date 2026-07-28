import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, X, ChevronDown } from 'lucide-react'
import { Country, State, City } from 'country-state-city'
import './CityAutocomplete.css'

/*
  LocationSelector — Selector jerárquico País → Estado/Departamento → Ciudad
  Usa la librería country-state-city (148k ciudades, 250 países).
  Sin llamadas API, sin rate limits.
  
  Props:
    label          — texto del label
    placeholder    — placeholder del input
    value          — { city, state, country, country_code, state_code, lat, lng } o null
    onChange       — callback con el objeto seleccionado o null
    showVerifiedBtn — (opcional) si true, muestra botón "Usar mi dirección oficial"
    onVerifiedClick — (opcional) callback cuando se pulsa el botón verificado
    hasVerifiedAddress — (opcional) si el usuario tiene dirección verificada
*/

export default function CityAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  showVerifiedBtn,
  onVerifiedClick,
  hasVerifiedAddress,
}) {
  const [countryInput, setCountryInput] = useState('')
  const [countryResults, setCountryResults] = useState([])
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(null) // { isoCode, name }

  const [stateInput, setStateInput] = useState('')
  const [stateResults, setStateResults] = useState([])
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [selectedState, setSelectedState] = useState(null) // { isoCode, name, countryCode }

  const [cityInput, setCityInput] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  const countryRef = useRef(null)
  const stateRef = useRef(null)
  const cityRef = useRef(null)

  // Sincronizar con value prop (inicial)
  useEffect(() => {
    if (value?.city) {
      const countryName = value.country || Country.getCountryByCode(value.country_code)?.name || ''
      setSelectedCountry({ isoCode: value.country_code, name: countryName })
      setCountryInput(countryName)

      const stateName = value.state || State.getStateByCodeAndCountry(value.state_code, value.country_code)?.name || ''
      setSelectedState({ isoCode: value.state_code, name: stateName, countryCode: value.country_code })
      setStateInput(stateName)
      setCityInput(`${value.city}`)
    }
  }, []) // eslint-disable-line

  // Cargar estados cuando cambia el país
  useEffect(() => {
    if (selectedCountry) {
      const states = State.getStatesOfCountry(selectedCountry.isoCode)
      setStateResults(states)
      setStateInput('')
      setSelectedState(null)
      setCityInput('')
    } else {
      setStateResults([])
      setSelectedState(null)
      setCityInput('')
    }
  }, [selectedCountry])

  // Cargar ciudades cuando cambia el estado
  useEffect(() => {
    if (selectedState && selectedCountry) {
      const cities = City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
      setCityResults(cities)
      setCityInput('')
    } else {
      setCityResults([])
    }
  }, [selectedState, selectedCountry])

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (countryRef.current && !countryRef.current.contains(e.target)) setShowCountryDropdown(false)
      if (stateRef.current && !stateRef.current.contains(e.target)) setShowStateDropdown(false)
      if (cityRef.current && !cityRef.current.contains(e.target)) setShowCityDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Filtrado por input ── */
  const filterCountries = useCallback((q) => {
    if (q.length < 2) { setCountryResults([]); return }
    const all = Country.getAllCountries()
    const filtered = all.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    setCountryResults(filtered)
    setShowCountryDropdown(filtered.length > 0)
  }, [])

  const filterStates = useCallback((q) => {
    if (!selectedCountry) return
    if (q.length < 1) { setStateResults(State.getStatesOfCountry(selectedCountry.isoCode)); return }
    const all = State.getStatesOfCountry(selectedCountry.isoCode)
    const filtered = all.filter(s => s.name.toLowerCase().includes(q.toLowerCase()))
    setStateResults(filtered)
    setShowStateDropdown(filtered.length > 0)
  }, [selectedCountry])

  const filterCities = useCallback((q) => {
    if (!selectedState || !selectedCountry) return
    if (q.length < 1) {
      const all = City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
      setCityResults(all)
      setShowCityDropdown(all.length > 0)
      return
    }
    const all = City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
    const filtered = all.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    setCityResults(filtered)
    setShowCityDropdown(filtered.length > 0)
  }, [selectedState, selectedCountry])

  /* ── Selectors ── */
  const selectCountry = (c) => {
    setSelectedCountry({ isoCode: c.isoCode, name: c.name })
    setCountryInput(c.name)
    setShowCountryDropdown(false)
    onChange(null) // Reset al cambiar país
  }

  const selectState = (s) => {
    setSelectedState({ isoCode: s.isoCode, name: s.name, countryCode: selectedCountry.isoCode })
    setStateInput(s.name)
    setShowStateDropdown(false)
    onChange(null) // Reset al cambiar estado
  }

  const selectCity = (c) => {
    setCityInput(c.name)
    setShowCityDropdown(false)
    const result = {
      city: c.name,
      country: selectedCountry.name,
      country_code: selectedCountry.isoCode,
      state: selectedState.name,
      state_code: selectedState.isoCode,
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
    <div className="ca-wrapper" style={{ gap: '0.4rem' }}>
      <label className="ca-label">{label}</label>

      {/* ── País ── */}
      <div className="ca-input-row" ref={countryRef}>
        <div className="ca-input-container">
          <div className="ca-input-inner">
            <input
              className="input ca-input"
              type="text"
              placeholder="País"
              value={countryInput}
              onChange={e => { setCountryInput(e.target.value); filterCountries(e.target.value) }}
              onFocus={() => countryInput.length >= 2 && setShowCountryDropdown(true)}
              readOnly={!!selectedCountry && !showCountryDropdown}
            />
            {selectedCountry && !showCountryDropdown && (
              <button type="button" className="ca-clear" onClick={() => { setSelectedCountry(null); setCountryInput(''); }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
      {showCountryDropdown && countryResults.length > 0 && (
        <ul className="ca-dropdown">
          {countryResults.slice(0, 10).map((c) => (
            <li key={c.isoCode} className="ca-dropdown-item" onClick={() => selectCountry(c)}>
              <MapPin size={13} className="ca-item-icon" />
              <div className="ca-item-text">
                <span className="ca-item-city">{c.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Estado / Departamento ── */}
      {selectedCountry && (
        <>
          <div className="ca-input-row" ref={stateRef}>
            <div className="ca-input-container">
              <div className="ca-input-inner">
                <input
                  className="input ca-input"
                  type="text"
                  placeholder="Departamento / Estado / Provincia"
                  value={stateInput}
                  onChange={e => { setStateInput(e.target.value); filterStates(e.target.value) }}
                  onFocus={() => stateInput.length >= 1 && setShowStateDropdown(true)}
                  readOnly={!!selectedState && !showStateDropdown}
                />
                {selectedState && !showStateDropdown && (
                  <button type="button" className="ca-clear" onClick={() => { setSelectedState(null); setStateInput(''); }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
          {showStateDropdown && stateResults.length > 0 && (
            <ul className="ca-dropdown">
              {stateResults.slice(0, 10).map((s) => (
                <li key={s.isoCode} className="ca-dropdown-item" onClick={() => selectState(s)}>
                  <MapPin size={13} className="ca-item-icon" />
                  <div className="ca-item-text">
                    <span className="ca-item-city">{s.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── Ciudad ── */}
      {selectedState && (
        <>
          <div className="ca-input-row" ref={cityRef}>
            <div className="ca-input-container">
              <div className="ca-input-inner">
                <input
                  className="input ca-input"
                  type="text"
                  placeholder="Ciudad"
                  value={cityInput}
                  onChange={e => { setCityInput(e.target.value); filterCities(e.target.value) }}
                  onFocus={() => cityInput.length >= 1 && setShowCityDropdown(true)}
                  readOnly={!!value && value.city && !showCityDropdown}
                />
                {value?.city && !showCityDropdown && (
                  <button type="button" className="ca-clear" onClick={clear}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            {showVerifiedBtn && (
              <button
                type="button"
                className="ca-verified-btn"
                onClick={onVerifiedClick}
                disabled={!hasVerifiedAddress}
                title={hasVerifiedAddress ? 'Usar mi dirección oficial' : 'Configura tu dirección en Mi Cuenta'}
              >
                <MapPin size={12} />
              </button>
            )}
          </div>
          {showCityDropdown && cityResults.length > 0 && (
            <ul className="ca-dropdown">
              {cityResults.slice(0, 10).map((c, i) => (
                <li key={`${c.stateCode}-${c.name}-${i}`} className="ca-dropdown-item" onClick={() => selectCity(c)}>
                  <MapPin size={13} className="ca-item-icon" />
                  <div className="ca-item-text">
                    <span className="ca-item-city">{c.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
