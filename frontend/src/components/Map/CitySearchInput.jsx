import { useState, useRef, useCallback, useEffect } from 'react';

const SEARCH_DELAY = 300;

function CitySearchInput({ onCitySelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cities, setCities] = useState([]);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load cities data once on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}cities.json`);
        if (!response.ok) throw new Error('Failed to load cities');
        const data = await response.json();
        setCities(data);
      } catch {
        setError('Erreur: Impossible de charger les villes');
      }
    }
    loadCities();
  }, []);

  const handleClickOutside = useCallback((e) => {
    if (
      dropdownRef.current && !dropdownRef.current.contains(e.target) &&
      inputRef.current && !inputRef.current.contains(e.target)
    ) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setShowDropdown(false);
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Local search: match anywhere in city name or region
      const lowerQuery = value.toLowerCase();
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.region.toLowerCase().includes(lowerQuery)
      ).slice(0, 5);
      
      setResults(filtered);
      setShowDropdown(true);
    }, SEARCH_DELAY);
  }, [cities]);

  const handleSelect = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onCitySelect({ lat, lng, source: 'city' }, result.name);
    setQuery(result.name);
    setShowDropdown(false);
  }, [onCitySelect]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
  }, [results, handleSelect]);

  return (
    <div className="city-search-container" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Rechercher une ville"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="city-search-input"
      />
      {loading && <div className="search-loading">Chargement...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && !error && showDropdown && results.length > 0 && (
        <ul className="city-search-dropdown">
          {results.map((result, index) => (
            <li
              key={index}
              onClick={() => handleSelect(result)}
              className="city-search-item"
            >
              {result.name}, {result.region}
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && showDropdown && results.length === 0 && (
        <div className="city-search-dropdown">
          <div className="no-results">Aucune ville trouvée</div>
        </div>
      )}
    </div>
  );
}

export default CitySearchInput;
