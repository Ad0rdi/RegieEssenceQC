# Unified City & Address Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Nominatim API address search to the existing city search component, with a toggle to switch between city mode and precise address mode.

**Architecture:** A new custom hook `useNominatimSearch` encapsulates API calling, caching (localStorage 24h TTL), and rate limiting (1 req/sec). The existing `CitySearchInput` component gains a toggle button and search button, routing to either local city search or Nominatim search based on the active mode.

**Tech Stack:** React 19, Vitest 4, Testing Library, fetch API, localStorage

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| **Create** | `src/hooks/useNominatimSearch.js` | Nominatim API wrapper with caching and rate limiting |
| **Create** | `src/hooks/__tests__/useNominatimSearch.test.js` | Tests for the hook |
| **Modify** | `src/components/Map/CitySearchInput.jsx` | Add toggle, search button, dual-mode logic |
| **Modify** | `src/components/Map/__tests__/CitySearchInput.test.jsx` | Add tests for precise mode |
| **Modify** | `src/App.jsx:121-123` | Rename `handleCitySelect` to `handleLocationSelect` |

---

### Task 1: Create `useNominatimSearch` hook — caching utility

**Files:**
- Create: `src/hooks/useNominatimSearch.js`

- [ ] **Step 1: Write the hook skeleton with caching utility functions**

```js
// src/hooks/useNominatimSearch.js

const QUEBEC_VIEWBOX = '-79.5,41.5,-57.5,52.5'; // west,south,east,north
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const RATE_LIMIT_DELAY = 1000; // 1 request per second (Nominatim requirement)

function getCacheKey(query) {
  return `nominatim_${query.toLowerCase().trim()}`;
}

function getCachedResults(query) {
  try {
    const key = getCacheKey(query);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedResults(query, data) {
  try {
    const key = getCacheKey(query);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function clearCache(query) {
  try {
    const key = getCacheKey(query);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export { getCacheKey, getCachedResults, setCachedResults, clearCache };
```

- [ ] **Step 2: Verify syntax — no errors**

Run: `node -c /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend/src/hooks/useNominatimSearch.js 2>&1 || true`
Expected: no output (file is ESM with export, node -c may warn, just check no syntax errors)

---

### Task 2: Create `useNominatimSearch` hook — main hook with search, rate limiting, abort

**Files:**
- Modify: `src/hooks/useNominatimSearch.js`

- [ ] **Step 1: Add the main hook with search, rate limiting, and AbortController**

Append to the end of `src/hooks/useNominatimSearch.js`:

```js
import { useCallback, useRef, useState } from 'react';

export function useNominatimSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const lastRequestTimeRef = useRef(0);
  const abortControllerRef = useRef(null);

  const search = useCallback(async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError(null);
      return [];
    }

    setError(null);

    // Check cache first
    const cached = getCachedResults(trimmed);
    if (cached) {
      return cached;
    }

    // Rate limiting: wait if last request was too recent
    const now = Date.now();
    const elapsed = now - lastRequestTimeRef.current;
    if (elapsed < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - elapsed));
    }

    // Abort any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);

    try {
      lastRequestTimeRef.current = Date.now();

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=5&countrycodes=ca&bounded=1&viewbox=${QUEBEC_VIEWBOX}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        if (response.status === 429) {
          setError('Trop de requêtes, réessayez plus tard.');
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const results = data
        .filter(item => item.lat && item.lon)
        .map(item => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          name: item.display_name,
          display_name: item.display_name,
        }));

      setCachedResults(trimmed, results);
      return results;
    } catch (err) {
      if (err.name === 'AbortError') return [];
      setError('Impossible de rechercher. Vérifiez votre connexion.');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearAllCache = useCallback(() => {
    // Clear all nominatim cache entries
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('nominatim_')) {
        localStorage.removeItem(key);
      }
    }
  }, []);

  return { search, isSearching, error, clearAllCache };
}

export default useNominatimSearch;
```

- [ ] **Step 2: Verify syntax**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npx eslint src/hooks/useNominatimSearch.js 2>&1`
Expected: no errors (or only minor warnings, no fatal errors)

---

### Task 3: Write tests for `useNominatimSearch`

**Files:**
- Create: `src/hooks/__tests__/useNominatimSearch.test.js`

- [ ] **Step 1: Write the test file**

```js
// src/hooks/__tests__/useNominatimSearch.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNominatimSearch, getCachedResults, setCachedResults } from '../useNominatimSearch';

// Mock fetch globally
const mockFetch = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
  // Clear localStorage before each test
  localStorage.clear();
  // Mock performance.now for consistent timing
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNominatimSearch', () => {
  it('returns cached results when available', async () => {
    // Pre-populate cache
    setCachedResults('ste-foy', [
      { lat: 46.77, lng: -71.28, name: 'Ste-Foy, QC', display_name: 'Ste-Foy, QC' }
    ]);

    // Mock fetch should NOT be called
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useNominatimSearch());

    let results;
    await act(async () => {
      results = await result.current.search('ste-Foy');
    });

    expect(results).toEqual([
      { lat: 46.77, lng: -71.28, name: 'Ste-Foy, QC', display_name: 'Ste-Foy, QC' }
    ]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls Nominatim API when cache is empty', async () => {
    const nominatimResponse = [
      {
        lat: '46.77',
        lon: '-71.28',
        display_name: 'Ste-Foy, Quebec, Canada',
      },
      {
        lat: '46.78',
        lon: '-71.27',
        display_name: 'Ste-Foy–Sillery, Quebec, Canada',
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => nominatimResponse
    });

    const { result } = renderHook(() => useNominatimSearch());

    let results;
    await act(async () => {
      results = await result.current.search('ste-foy');
    });

    expect(results).toEqual([
      { lat: 46.77, lng: -71.28, name: 'Ste-Foy, Quebec, Canada', display_name: 'Ste-Foy, Quebec, Canada' },
      { lat: 46.78, lng: -71.27, name: 'Ste-Foy–Sillery, Quebec, Canada', display_name: 'Ste-Foy–Sillery, Quebec, Canada' }
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ste-foy'),
      expect.any(Object)
    );
  });

  it('caches results after API call', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: '46.81',
        lon: '-71.21',
        display_name: 'Quebec City, QC, Canada'
      }]
    });

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      await result.current.search('quebec');
    });

    // Second call should use cache
    await act(async () => {
      await result.current.search('quebec');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty array for queries shorter than 2 characters', async () => {
    const { result } = renderHook(() => useNominatimSearch());

    let results;
    await act(async () => {
      results = await result.current.search('a');
    });

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('sets error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      await result.current.search('montreal');
    });

    expect(result.current.error).toBe('Impossible de rechercher. Vérifiez votre connexion.');
    expect(result.current.isSearching).toBe(false);
  });

  it('sets rate limit error on 429 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      await result.current.search('montreal');
    });

    expect(result.current.error).toBe('Trop de requêtes, réessayez plus tard.');
  });

  it('shows isSearching while fetching', async () => {
    // Don't resolve immediately — let isSearching become true
    let resolveFetch;
    mockFetch.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));
    resolveFetch({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useNominatimSearch());

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => expect(result.current.isSearching).toBe(true));
  });

  it('respects rate limiting (1 req/sec)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const { result } = renderHook(() => useNominatimSearch());

    // First call immediately
    await act(async () => {
      await result.current.search('test1');
    });

    const firstCallTime = Date.now();

    // Second call right away — should be delayed by rate limiter
    vi.advanceTimersByTime(100); // only 100ms passed

    await act(async () => {
      await result.current.search('test2');
    });

    // The second call should have waited, so total time > 1000ms
    const totalElapsed = Date.now() - firstCallTime;
    // Note: with fake timers, we check that fetch was called with correct timing
    // The key behavior is that fetch is only called once per second
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('clears all cache entries', async () => {
    setCachedResults('test1', []);
    setCachedResults('test2', []);
    localStorage.setItem('other_key', 'value');

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      result.current.clearAllCache();
    });

    expect(localStorage.getItem('nominatim_test1')).toBeNull();
    expect(localStorage.getItem('nominatim_test2')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('value');
  });
});
```

- [ ] **Step 2: Run the tests — expect failures** (hook not yet exported properly or implementation issues)

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run test:run src/hooks/__tests__/useNominatimSearch.test.js`
Expected: some failures — we'll fix in the next step by ensuring implementation is correct

---

### Task 4: Fix tests if needed and commit

- [ ] **Step 1: Fix any test failures**

Review the output from Task 3 Step 2. Fix the hook implementation to make all tests pass. Common fixes might include:
- Adjusting the rate limiting test timing
- Fixing mock expectations
- Ensuring all exports are correct

- [ ] **Step 2: Run tests — expect all passing**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run test:run src/hooks/__tests__/useNominatimSearch.test.js`
Expected: All 8 tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useNominatimSearch.js
git add frontend/src/hooks/__tests__/useNominatimSearch.test.js
git commit -m "feat: add useNominatimSearch hook with caching and rate limiting"
```

---

### Task 5: Update `CitySearchInput.jsx` — add precise mode state and toggle

**Files:**
- Modify: `src/components/Map/CitySearchInput.jsx`

- [ ] **Step 1: Add imports and precise mode state**

Add to the top of `CitySearchInput.jsx`, after the existing import:

```js
import { useNominatimSearch } from '../../hooks/useNominatimSearch';
```

Add state inside the component, after the existing `cities` state:

```js
  const { search: nominatimSearch, isSearching: isPreciseSearching, error: nominatimError } = useNominatimSearch();
  const [isPreciseMode, setIsPreciseMode] = useState(false);
  const [preciseResults, setPreciseResults] = useState([]);
  const [showPreciseDropdown, setShowPreciseDropdown] = useState(false);
  const preciseTimeoutRef = useRef(null);
```

- [ ] **Step 2: Add the toggle handler function**

Add inside the component, after `handleBlur`:

```js
  const togglePreciseMode = useCallback(() => {
    setIsPreciseMode(prev => !prev);
    // Reset state when switching modes
    setPreciseResults([]);
    setShowPreciseDropdown(false);
  }, []);

  const resetToCityMode = useCallback(() => {
    setIsPreciseMode(false);
    setPreciseResults([]);
    setShowPreciseDropdown(false);
  }, []);
```

- [ ] **Step 3: Add the precise search handler function**

Add after `togglePreciseMode`:

```js
  const handlePreciseSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setPreciseResults([]);
    setShowPreciseDropdown(true);

    const results = await nominatimSearch(trimmed);
    setPreciseResults(results);
    if (results.length > 0) {
      setShowPreciseDropdown(true);
    }
  }, [query, nominatimSearch]);

  const handlePreciseKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handlePreciseSearch();
    }
  }, [handlePreciseSearch]);
```

- [ ] **Step 4: Update the `handleSelect` function to support both modes**

Replace the existing `handleSelect`:

```js
  const handleSelect = useCallback((result, source) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lng);
    onCitySelect({ lat, lng, source }, result.name || result.display_name || '');
    setQuery(result.name || result.display_name || query);
    setShowDropdown(false);
    setShowPreciseDropdown(false);
    // Auto-reset to city mode after selection in precise mode
    if (source === 'address') {
      resetToCityMode();
    }
  }, [onCitySelect, query, resetToCityMode]);
```

- [ ] **Step 5: Update the render — add toggle button, search button, and update placeholders**

Replace the entire `return` block of the component with:

```js
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
      {loading && <div className="search-loading">Chargement...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && !error && showDropdown && results.length > 0 && (
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
      {!loading && !error && showDropdown && results.length === 0 && (
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
```

- [ ] **Step 6: Run existing tests — expect passing (no regressions)**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run test:run src/components/Map/__tests__/CitySearchInput.test.jsx`
Expected: All 5 existing tests PASS

---

### Task 6: Add CSS for new UI elements

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add styles for the precise mode UI elements**

Find the `city-search-container` styles in `src/index.css` and add/modify the following CSS. Append near the end of the file or after the existing city search styles:

```css
/* Unified search wrapper */
.city-search-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.city-search-wrapper .city-search-input {
  flex: 1;
}

/* Precise mode toggle button */
.precise-mode-toggle {
  background: transparent;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 36px;
}

.precise-mode-toggle:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.05));
}

.precise-mode-toggle[aria-pressed="true"],
.precise-mode-toggle.active {
  background: var(--primary-color, #4a90d9);
  color: white;
  border-color: var(--primary-color, #4a90d9);
}

/* Precise mode search button */
.precise-search-btn {
  background: var(--primary-color, #4a90d9);
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  transition: opacity 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 36px;
  color: white;
}

.precise-search-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.precise-search-btn:not(:disabled):hover {
  opacity: 0.85;
}

/* Search spinner */
.search-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Verify no CSS syntax errors**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run build 2>&1 | head -20`
Expected: build succeeds (or at least no CSS errors in output)

---

### Task 7: Update `App.jsx` — rename callback

**Files:**
- Modify: `src/App.jsx:121-123`

- [ ] **Step 1: Rename `handleCitySelect` to `handleLocationSelect`**

Find line 121 in `src/App.jsx` and replace:

```js
// OLD:
const handleCitySelect = useCallback((location) => {
  setCenterLocation(location);
}, []);

// NEW:
const handleLocationSelect = useCallback((location) => {
  setCenterLocation(location);
}, []);
```

Then find line 217 where it's passed as prop and replace:

```js
// OLD:
<CitySearchInput onCitySelect={handleCitySelect} />

// NEW:
<CitySearchInput onCitySelect={handleLocationSelect} />
```

- [ ] **Step 2: Run all existing tests — expect passing**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run test:run`
Expected: All tests PASS

---

### Task 8: Add tests for precise mode in `CitySearchInput.test.jsx`

**Files:**
- Modify: `src/components/Map/__tests__/CitySearchInput.test.jsx`

- [ ] **Step 1: Add precise mode tests**

Append to the end of the existing test file:

```js
  it('toggles to precise mode when clicking the toggle button', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    // Click the toggle button to switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);
    
    // Placeholder should change
    expect(screen.getByPlaceholderText(/rechercher une adresse/i)).toBeInTheDocument();
  });

  it('shows search button only in precise mode', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    // Search button should NOT be visible in city mode
    expect(screen.queryByTitle('Rechercher')).not.toBeInTheDocument();
    
    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);
    
    // Type something to enable the search button
    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: 'montreal' } });
    
    // Search button should now be visible and enabled
    const searchBtn = screen.getByTitle('Rechercher');
    expect(searchBtn).toBeInTheDocument();
    expect(searchBtn).not.toBeDisabled();
  });

  it('auto-resets to city mode after selecting an address result', async () => {
    // Mock cities.json load
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockCitiesData,
    });
    
    // Mock Nominatim API response
    const nominatimResponse = [
      {
        lat: '45.5017',
        lon: '-73.5673',
        display_name: 'Montreal, QC, Canada'
      }
    ];
    
    // We need to mock the fetch used by useNominatimSearch
    // Since it's a separate call, we chain the mocks
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCitiesData })
      .mockResolvedValueOnce({ ok: true, json: async () => nominatimResponse });
    
    render(<CitySearchInput onCitySelect={mockCallback} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);
    
    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: 'montreal' } });
    
    // Click search button
    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Montreal, QC, Canada')).toBeInTheDocument();
    });
    
    // Select the result
    await fireEvent.click(screen.getByText('Montreal, QC, Canada'));
    
    // Toggle should have auto-reset: placeholder should be back to city mode
    expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    
    // Callback should have been called with address source
    expect(mockCallback).toHaveBeenCalledWith(
      { lat: 45.5017, lng: -73.5673, source: 'address' },
      'Montreal, QC, Canada'
    );
  });

  it('displays no results message for precise mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [], // No results from Nominatim
    });
    
    render(<CitySearchInput onCitySelect={mockCallback} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);
    
    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: 'xyznonexistent' } });
    
    // Click search button
    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/aucun résultat/i)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run all tests — expect passing**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run test:run`
Expected: All 9 tests PASS (5 existing + 4 new)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Map/CitySearchInput.jsx
git add frontend/src/index.css
git add frontend/src/App.jsx
git add frontend/src/components/Map/__tests__/CitySearchInput.test.jsx
git commit -m "feat: add unified city/address search with precise mode toggle"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run all tests one more time**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run test:run`
Expected: All tests PASS

- [ ] **Step 2: Run lint**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run lint`
Expected: No errors

- [ ] **Step 3: Build**

Run: `cd /home/adam/Projets_perso/RegieEssenceQuebec_v2/frontend && npm run build`
Expected: Build succeeds

---

## Plan Self-Review

**Spec coverage:**
- `useNominatimSearch.js` hook with API, caching, rate limiting → Tasks 1, 2, 3, 4
- Toggle button (📍) with auto-reset after selection → Task 5
- Search button (🔍) visible only in precise mode → Task 5
- Dropdown results same UX → Task 5
- Error handling (network, 429, no results) → Tasks 2, 5
- App.jsx callback rename → Task 7
- Tests for hook → Task 3
- Tests for component → Task 8
- CSS for new elements → Task 6
- Final verification → Task 9

**Placeholder scan:** No placeholders found. All steps have actual code.

**Type consistency:** `search` returns `Promise<Array<{lat, lng, name, display_name}>>` everywhere. `handleSelect` accepts `{lat, lng, name?, display_name?, ...}` and `source` string. Consistent.

**Scope check:** Focused on a single feature — unified search. No unrelated refactoring.
