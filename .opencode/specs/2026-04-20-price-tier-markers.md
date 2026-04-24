# Price Tier Markers — Design Spec

**Goal:** Color-coded markers on the map showing fuel price levels, with split colors for multi-fuel selection and a translated legend.

## 1. Split SVG Marker Icons

**File:** `frontend/src/components/Map/mapIcons.js` (modify)

Each station marker is an SVG `<divIcon>` — a circle divided into pie slices, one per selected fuel type. Each slice colored by its price tier.

### Visual

- **1 fuel selected:** Full circle (single color)
- **2 fuels selected:** Two 180° semicircles
- **3 fuels selected:** Three 120° slices
- **Selected station:** White stroke outline on slices

### Colors

| Tier | Color | Hex |
|------|-------|-----|
| Cheapest | Green | `#22c55e` |
| Mid-range | Yellow | `#eab308` |
| Most expensive | Red | `#ef4444` |

### Implementation

- `createSplitMarkerIcon(prices, selectedFuelTypes, selectedStationId)` — returns `L.divIcon` with inline SVG pie chart
- SVG viewBox: `"-12.5 -12.5 25 25"` (25x25 circle, radius 12.5)
- Marker anchor: `[12.5, 12.5]` (bottom center for proper map placement)
- Pie slice paths calculated dynamically based on number of selected fuel types
- Selected station: white stroke (`stroke="#fff" stroke-width="1.5"`) on each slice

## 2. Price Tier Calculation

**File:** `frontend/src/components/Map/priceTiers.js` (new)

Pure utility module.

### API

```js
function createPriceTierCalculator(allStations) {
  // Returns { getPriceTier(fuelType, price): 'cheap' | 'medium' | 'expensive' }
}
```

### Logic

1. Collect all prices for each fuel type across the station dataset
2. Sort prices per fuel type
3. Split into 3 groups: bottom 33% = cheap, middle 33% = medium, top 33% = expensive
4. Return tier for any given fuel type + price

### Example

For "super" fuel type with prices `[1.45, 1.50, 1.55, 1.60, 1.65, 1.70]`:
- Sorted: `[1.45, 1.50, 1.55, 1.60, 1.65, 1.70]`
- Cheap: `[1.45, 1.50, 1.55]` (≤ 1.55)
- Medium: `[1.60, 1.65, 1.70]` (wait, this is wrong — should be 2 each)
- Actually: cheap = indices 0-1, medium = indices 2-3, expensive = indices 4-5

Correct approach: `Math.floor(index / total * 3)` gives tier index 0, 1, or 2.

## 3. Price Legend Component

**File:** `frontend/src/components/Map/PriceLegend.jsx` (new)

Small styled div positioned at bottom-left of map.

### Visual

```
┌──────────────┐
│ Price Info   │
│ ─────────    │
│ 🟢 Cheapest  │
│ 🟡 Mid-range │
│ 🔴 Most exp. │
└──────────────┘
```

### Styling

- Font size: 11px
- Padding: 6px 10px
- Background: `var(--bg)` with 0.9 opacity
- Border: `1px solid var(--border)`
- Border radius: 6px
- Box shadow: same as `station-drawer`
- Z-index: 1002 (above map tiles)
- Position: bottom-left of map container

### Translation (see Section 5)

Uses `useLanguage` hook for all text.

## 4. Integration

### `MapMarkers.jsx` (modify)

- Generate `L.divIcon` with inline SVG for each station using `createSplitMarkerIcon`
- Pass `selectedFuelTypes` and station `prices` to the icon creator
- Keep existing `selectedStationId` logic for white stroke effect

### `App.jsx` (modify)

- Import and render `<PriceLegend />` inside `<MapContainer>`
- Pass `stations` to `createPriceTierCalculator` (computed once via `useMemo`)

### `useStations.js` (no change)

- Price tier calculation happens in the component layer, not the data hook
- Hook continues returning `station.prices` object as before

## 5. Language Detection Hook

**File:** `frontend/src/hooks/useLanguage.js` (new)

Lightweight translation hook — no i18n library needed.

### API

```js
const { t } = useLanguage();
t('legend.title')   // → "Price Info" or "Info sur les prix"
t('legend.cheap')   // → "Cheapest" or "Moins cher"
t('legend.mid')     // → "Mid-range" or "Prix moyen"
t('legend.expensive') // → "Most expensive" or "Plus cher"
```

### Logic

1. Read `navigator.language` on mount
2. If language starts with `fr` → use French translations
3. Otherwise → use English translations
4. Cache result (no re-detection on re-render)

### Translations

| Key | English | French |
|-----|---------|--------|
| `legend.title` | Price Info | Info sur les prix |
| `legend.cheap` | Cheapest | Moins cher |
| `legend.mid` | Mid-range | Prix moyen |
| `legend.expensive` | Most expensive | Plus cher |

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `mapIcons.js` | Modify | Add `createSplitMarkerIcon()` |
| `priceTiers.js` | New | Price tier calculation utility |
| `PriceLegend.jsx` | New | Legend component |
| `useLanguage.js` | New | French/English language detection |
| `MapMarkers.jsx` | Modify | Use split markers instead of `selectedIcon` |
| `App.jsx` | Modify | Add `PriceLegend` + `usePriceTierCalculator` |

## Edge Cases

- **Station with no prices:** Show gray/white marker (no slices)
- **Station with prices but none selected:** Same — no slices
- **Single station with one fuel type:** Full circle marker
- **All stations same price:** All markers green (or all same tier — no distinction, which is correct)
- **Very few stations (1-2):** Tier calculation still works (1 station = cheap or expensive depending on value)
