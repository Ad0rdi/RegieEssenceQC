# Unified City & Address Search Design

## Overview

Extend the existing city search in `CitySearchInput.jsx` to support address search in Quebec province using the Nominatim (OpenStreetMap) API. The search field remains unified — a toggle button switches between city mode (default, local data) and precise mode (Nominatim API).

## Design Decisions

- **Unified search field** — One input, two modes
- **Contextual toggle** — "Mode précis" button toggles to Nominatim mode, auto-resets after selection
- **Manual trigger** — No auto-debounce for Nominatim; user clicks a search button
- **Dropdown results** — Nominatim results shown as a dropdown, same UX as city results
- **Hook separation** — `useNominatimSearch` custom hook encapsulates API logic

## Architecture

### New Files

#### `src/hooks/useNominatimSearch.js`

Custom hook for Nominatim geocoding:

```js
useNominatimSearch()
  .search(query)        // Returns Promise<Array<result>>
  .isSearching          // boolean (loading state)
  .error                // string | null
  .clearCache()         // Optional: clear localStorage cache
```

Responsibilities:
- Call `https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5&countrycodes=ca&bounded=1&viewbox={quebec_bounding_box}`
- Enforce 1 request/second (rate limiting) — if user clicks search button multiple times quickly, debounce clicks at 1000ms and abort previous pending request using AbortController
- Cache results in `localStorage` with 24h TTL
- Return results as `{ lat, lng, name, display_name }` objects

Caching strategy:
```js
const cacheKey = (query) => `nominatim_${query.toLowerCase().trim()}`
// Store: { data: [...], timestamp: Date.now() }
// TTL: 24 hours
```

Quebec bounding box for `viewbox` (approximate):
```
west: -79.5
south: 41.5
east: -57.5
north: 52.5
```

### Modified Files

#### `src/components/Map/CitySearchInput.jsx`

Changes:
- Add toggle button (📍 icon) next to the input
- Toggle state: `isPreciseMode` (default `false`)
- When `isPreciseMode` is `false`: existing city search behavior (unchanged)
- City mode debounce (300ms) stays unchanged (existing behavior)
- When `isPreciseMode` is `true`:
  - Placeholder changes to "Rechercher une adresse..."
  - Search button (🔍) becomes visible
  - Results populated by `useNominatimSearch` instead of local `cities.json`
  - Search triggers on button click (no auto-debounce)
- When a result is selected: call `onCitySelect`, then auto-reset toggle to `false`
- Styling: reuse existing dropdown styles

UI:
```
┌─────────────────────────────────────────────────┐
│ [Rechercher une ville / adresse...]    [🔍] [📍] │
├─────────────────────────────────────────────────┤
│ ▸ Ste-Foy, Québec                           │
│ ▸ Quebec City, QC                         │
└─────────────────────────────────────────────────┘
```

#### `src/App.jsx`

Changes:
- Rename `handleCitySelect` to `handleLocationSelect` (keeps same interface)
- Result object from precise mode includes `source: 'address'`
- `CityZoomController` already handles any `{lat, lng}` — no changes needed

```js
const handleLocationSelect = (location) => {
  setCenterLocation(location) // { lat, lng, source: 'city' | 'address' }
}
```

## Data Flow

```
User types in search → clicks 🔍 (precise mode)
  → useNominatimSearch.search(query)
    → check localStorage cache (24h TTL)
      → if cache hit: return cached results
      → if cache miss: fetch Nominatim API (1 req/sec limit)
        → transform results: { lat, lng, name: display_name }
        → store in cache
        → return results
  → dropdown renders results
  → user clicks a result
    → onCitySelect({ lat, lng, source: 'address' })
    → setCenterLocation → CityZoomController flies map
    → toggle auto-resets to false (back to city mode)
```

## Error Handling

| Error | Behavior |
|---|---|
| Network failure | Show "Impossible de rechercher. Vérifiez votre connexion." |
| No results | Show "Aucun résultat trouvé." |
| API 429 (rate limit) | Show "Trop de requêtes, réessayez plus tard." |
| Invalid query | Show "Requête invalide." |
| Search in progress | Spinner on 🔍 button, disable until complete |

## Testing

### `src/hooks/__tests__/useNominatimSearch.test.js`

- `search() returns cached results when available`
- `search() calls Nominatim API when cache is empty`
- `search() respects 1 request/second rate limit`
- `search() returns error on network failure`
- `cache expires after 24 hours`

### `src/components/Map/__tests__/CitySearchInput.test.jsx` (update existing)

- `toggle button switches to precise mode`
- `precise mode shows search button`
- `search button triggers Nominatim search`
- `selecting a result resets toggle to city mode`
- `dropdown closes after selection (any mode)`

## Implementation Order

1. Create `useNominatimSearch.js` hook (API, caching, rate limiting)
2. Update `CitySearchInput.jsx` (toggle, search button, dropdown logic)
3. Update `App.jsx` (rename callback, update JSDoc if needed)
4. Add tests for `useNominatimSearch`
5. Update existing tests in `CitySearchInput.test.jsx`
