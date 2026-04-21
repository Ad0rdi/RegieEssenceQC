import { useState, useRef, useCallback, useEffect } from 'react';

const QUEBEC_BBOX = '-80.0,41.0,-53.0,52.0';
const SEARCH_DELAY = 300;

function CitySearchInput({ onCitySelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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
      searchCities(value);
    }, SEARCH_DELAY);
  }, [handleClickOutside]);

  const searchCities = async (searchQuery) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}+quebec&format=json&limit=5&countrycodes=ca&bounded=1&viewbox=${QUEBEC_BBOX}`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'StationFinder-Quebec' }
      });
      
      if (!response.ok) {
        throw new Error('Network error');
      }
      
      const data = await response.json();
      setResults(data);
      setShowDropdown(true);
    } catch (err) {
      setError('Erreur: Impossible de chercher les villes');
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onCitySelect({ lat, lng, source: 'city' }, result.display_name);
    setQuery(result.display_name);
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
        placeholder="Rechercher une ville du Québec..."
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
              {result.display_name}
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
