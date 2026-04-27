# Map Click Location Selection Design

## Overview

Allow users to manually set the radius center by clicking on the map (desktop) or long-pressing (mobile). A blue circle marker appears at the chosen location.

## Component: MapClickHandler

**File:** `frontend/src/components/Map/MapClickHandler.jsx`

- Consumes `onMapClick` callback via props (from `App.jsx`)
- Consumes `isMobile` via `useIsMobile` hook
- Uses `useMap()` from react-leaflet to access the Leaflet map instance
- Registers event listeners on the map instance in a `useEffect`
- Cleans up listeners on unmount

### Desktop behavior

Listens for `click` event on the map. Before acting:

- Checks if the click target is a Leaflet marker by examining `e.originalEvent.target.classList.contains('leaflet-marker-icon')`. If true, the click is on a station marker — do nothing.
- Otherwise, converts `e.latlng` to `{ lat, lng, source: 'map' }` and calls `onMapClick`.

### Mobile behavior

Listens for `contextmenu` event on the map (triggers on long-press). Before acting:

- Same marker check as desktop.
- Calls `e.originalEvent.preventDefault()` to suppress the browser context menu.
- Converts `e.latlng` to `{ lat, lng, source: 'map' }` and calls `onMapClick`.

### Interaction with other markers

- **Station markers:** Filtered via CSS class check on `e.originalEvent.target`. Station markers use `L.marker()` which renders with class `leaflet-marker-icon`.
- **GPS marker:** Already has `pointer-events: none` set — clicks pass through to the map.
- **Address marker:** Already has `pointer-events: none` set — clicks pass through to the map.
- **MapController/MapMarkers:** Station marker `click` handlers use `L.DomEvent.disableClickPropagation()` in existing code — but the class check in MapClickHandler is the primary filter since station markers don't currently have click propagation disabled.

## State Changes in App.jsx

**New state:** `manualMarkerLocation` — tracks the location set by user map click.

- When user clicks map: sets `centerLocation` and `manualMarkerLocation` to the clicked coordinates.
- When user selects address via search: sets `centerLocation` and `addressLocation` (address marker renders). `manualMarkerLocation` is cleared.
- When user selects city via search: sets `centerLocation`. `manualMarkerLocation` and `addressLocation` are both cleared.
- When GPS is acquired: sets `centerLocation`. `manualMarkerLocation` and `addressLocation` are cleared.
- When radius is manually entered: no effect on markers.
- When reset button is clicked: all three locations (`centerLocation`, `addressLocation`, `manualMarkerLocation`) are cleared.

**Rendered marker:**
- If `addressLocation` exists → `AddressMarker` renders (blue marker from address search).
- If `manualMarkerLocation` exists (and not `addressLocation`) → `AddressMarker` renders (same visual, blue marker from manual click).

This reuses the existing `AddressMarker` component — no new marker component needed.

## Test File: MapClickHandler.test.jsx

Tests via Vitest:

1. Desktop: click on map sets location via callback
2. Desktop: click on station marker (with `leaflet-marker-icon` class) does not set location
3. Mobile: contextmenu on map sets location via callback
4. Mobile: contextmenu on station marker does not set location
5. Cleanup: unmounting removes event listeners

Mock strategy:
- Mock `useMap` to return a map with `on` / `off` methods (spy calls)
- Mock `useIsMobile` to accept parameter for testing mobile/desktop
- Emit events via the mock map's registered callbacks

## Integration Points

- `App.jsx` renders `MapClickHandler` inside `MapContainer`
- `App.jsx` passes `onMapClick` handler that updates state
- `App.jsx` renders `AddressMarker` for both `addressLocation` and `manualMarkerLocation`
- No changes to existing components needed (GPS, station markers, search are unaffected)
