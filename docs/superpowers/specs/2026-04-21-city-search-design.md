# City Search Feature Design

## Goal

Replace the single "Use My Location" button with two side-by-side location options: GPS-based and city-based. Both set the map's center point for radius filtering, and whichever action runs last wins.

## UI Layout

```
[📍 Use My Location]  [🔍 Search city...]
```

Both sit in the header filter bar next to each other.

## State Model

```ts
type CenterSource = 'gps' | 'city';

interface CenterLocation {
  lat: number;
  lng: number;
  source: CenterSource;
}
```

Single state variable `centerLocation: CenterLocation | null` replaces the existing `userLocation` state. Defaults to `null` (map centers on DEFAULT_CENTER = Montreal).

### Behavior
- GPS button → `centerLocation = { lat, lng, source: 'gps' }`
- City selected → `centerLocation = { lat, lng, source: 'city' }`
- Radius filter uses `centerLocation` (if set)
- Either action replaces the other (last wins)

## Components

### CitySearchInput (new)

**File:** `frontend/src/components/Map/CitySearchInput.jsx`

- Debounced input (300ms) with autocomplete dropdown
- Placeholder: "Rechercher une ville du Québec..."
- Queries Nominatim API: `https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5&countrycodes=ca&bounded=1&viewbox={quebec_bbox}`
- Quebec bounding box: `[-80.0, 41.0, -53.0, 52.0]`
- Dropdown shows up to 5 suggestions: city name + region (e.g., "Sherbrooke, QC")
- Click outside dismisses dropdown without selection
- Enter key selects first result

### App.jsx (modified)

- Replace `userLocation` state with `centerLocation`
- Replace `getLocation()` with a shared `setCenterLocation()` function
- Wire both GPS and city into the same state
- Map `center` prop uses `centerLocation ?? DEFAULT_CENTER`
- Radius filter calculation uses `centerLocation`

## Nominatim API

- Free, no API key
- Rate limit: 1 request/second (debounce handles this)
- Required header: `User-Agent: StationFinder-Quebec`
- Fallback: show "Impossible de chercher les villes" on network failure
- No results: "Aucune ville trouvée"

## Data Flow

```
User types → debounce(300ms) → Nominatim API → dropdown → select → centerLocation = {lat, lng, source: 'city'}
User clicks GPS → navigator.geolocation → centerLocation = {lat, lng, source: 'gps'}
Radius filter → uses centerLocation.lat/lng if set
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No network | Show "Impossible de chercher les villes" |
| No results | Show "Aucune ville trouvée" |
| Rate limited | Show "Trop de requêtes, réessayez" |
| Click outside dropdown | Dismiss (no selection) |
| Empty input | Dismiss dropdown |
| Geolocation denied | Existing error messages (unchanged) |

## Testing

- CitySearchInput: input rendering, debounce, API mock, dropdown render, selection callback, click-outside dismiss, error states
- App.jsx: centerLocation state transitions (GPS→city, city→GPS), map center updates, radius filter uses correct center
