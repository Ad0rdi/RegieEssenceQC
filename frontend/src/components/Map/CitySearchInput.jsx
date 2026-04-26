import { useState, useRef, useCallback, useEffect } from 'react';
import { useNominatimSearch } from '../../utils/nominatimSearch';

const SEARCH_DELAY = 300;

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function CitySearchInput({ onCitySelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cities, setCities] = useState([]);
  const { search: nominatimSearch, isSearching: isPreciseSearching, error: nominatimError } = useNominatimSearch();
  const [isPreciseMode, setIsPreciseMode] = useState(false);
  const [preciseResults, setPreciseResults] = useState([]);
  const [showPreciseDropdown, setShowPreciseDropdown] = useState(false);
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

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setShowDropdown(false);
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const lowerQuery = trimmed.toLowerCase();
      const queryWords = lowerQuery.split(/\s+/);

      const scoreCity = (city) => {
        const nameLower = city.name.toLowerCase();
        const regionLower = city.region.toLowerCase();
        const nameWords = nameLower.split(/\s+/);
        const regionWords = regionLower.split(/\s+/);

        let score = 0;

        for (const qWord of queryWords) {
          // Exact match
          if (nameLower.includes(qWord) || regionLower.includes(qWord)) {
            score += 10;
            continue;
          }

          // First-char match (e.g., "mont" matches "montreal")
          if (nameLower.startsWith(qWord) || regionLower.startsWith(qWord)) {
            score += 5;
            continue;
          }

          // Per-word matching
          for (const word of [...nameWords, ...regionWords]) {
            if (word === qWord) { score += 10; break; }
            if (word.startsWith(qWord)) { score += 4; break; }
          }

          // Fuzzy: each matching char in order
          let qi = 0;
          for (const wi of [...nameWords, ...regionWords].join('').split('')) {
            if (qi < qWord.length && wi === qWord[qi]) qi++;
          }
          if (qi === qWord.length) score += qi * 0.5;

          // Edit distance (Levenshtein)
          const bestWord = [...nameWords, ...regionWords].reduce((best, word) => {
            const d = levenshtein(word, qWord);
            return d < best ? d : best;
          }, Infinity);
          if (bestWord <= 2 && bestWord > 0) {
            score += Math.max(0, 5 - bestWord);
          } else if (bestWord === 0) {
            // handled above
          }
        }

        return score;
      };

      const scored = cities.map(city => ({
        city,
        score: scoreCity(city)
      }));

      scored.sort((a, b) => b.score - a.score);
      const filtered = scored.filter(s => s.score > 0).map(s => s.city).slice(0, 5);
      
      setResults(filtered);
      setShowDropdown(true);
    }, SEARCH_DELAY);
  }, [cities]);

  const resetToCityMode = useCallback(() => {
    setIsPreciseMode(false);
    setPreciseResults([]);
    setShowPreciseDropdown(false);
  }, []);

  const handleSelect = useCallback((result, source) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lng ?? result.lon);
    onCitySelect({ lat, lng, source }, result.name || result.display_name || query);
    setQuery(result.name || result.display_name || query);
    setShowDropdown(false);
    setShowPreciseDropdown(false);
    if (source === 'address') {
      resetToCityMode();
    }
  }, [onCitySelect, query, resetToCityMode]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0], 'city');
    }
  }, [results, handleSelect]);

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.userSelect = 'text';
      inputRef.current.style.webkitUserSelect = 'text';
      inputRef.current.select();
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.userSelect = '';
      inputRef.current.style.webkitUserSelect = '';
    }
  }, []);

  const togglePreciseMode = useCallback(() => {
    setIsPreciseMode(prev => !prev);
    setPreciseResults([]);
    setShowPreciseDropdown(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  const handlePreciseSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setPreciseResults([]);
    setShowPreciseDropdown(true);

    const results = await nominatimSearch(trimmed);
    setPreciseResults(results);
  }, [query, nominatimSearch]);

  const handlePreciseKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handlePreciseSearch();
    }
  }, [handlePreciseSearch]);

  return (
    <div className="city-search-container" ref={dropdownRef}>
      <div className="city-search-wrapper">
        <input
          ref={inputRef}
          type="text"
          placeholder={isPreciseMode ? 'Rechercher une adresse' : 'Rechercher une ville'}
          value={query}
          onChange={handleInputChange}
          onKeyDown={isPreciseMode ? handlePreciseKeyDown : handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="city-search-input"
        />
        {isPreciseMode && (
          <button
            onClick={handlePreciseSearch}
            disabled={!query.trim() || isPreciseSearching}
            className="precise-search-btn"
            title="Rechercher"
          >
            {isPreciseSearching ? (
              <span className="search-spinner">⏳</span>
            ) : (
              <span className="search-icon">🔍</span>
            )}
          </button>
        )}
        <button
          onClick={togglePreciseMode}
          className="precise-mode-toggle"
          title={isPreciseMode ? 'Mode villes' : 'Mode précis'}
        >
          {isPreciseMode ? '🏙️' : '📍'}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {!error && showDropdown && results.length > 0 && (
        <ul className="city-search-dropdown">
          {results.map((result, index) => (
            <li
              key={index}
              onClick={() => handleSelect(result, 'city')}
              className="city-search-item"
            >
              {result.name}, {result.region}
            </li>
          ))}
        </ul>
      )}
      {!error && showDropdown && results.length === 0 && (
        <div className="city-search-dropdown">
          <div className="no-results">Aucune ville trouvée</div>
        </div>
      )}
      {isPreciseMode && (
        <>
          {nominatimError && <div className="error-message">{nominatimError}</div>}
          {showPreciseDropdown && preciseResults.length > 0 && (
            <ul className="city-search-dropdown">
              {preciseResults.map((result, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(result, 'address')}
                  className="city-search-item"
                  title={result.display_name}
                >
                  {result.name || result.display_name}
                </li>
              ))}
            </ul>
          )}
          {showPreciseDropdown && preciseResults.length === 0 && !isPreciseSearching && (
            <div className="city-search-dropdown">
              <div className="no-results">Aucun résultat trouvé</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CitySearchInput;
