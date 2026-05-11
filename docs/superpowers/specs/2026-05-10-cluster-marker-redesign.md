# Cluster Marker Redesign

> **Goal:** Redesign cluster markers on the map to show a pie chart with fuel type pricing info and station count, visually distinct from individual station markers.

**Architecture:** Replace the default leaflet.markercluster icons with custom `L.divIcon` elements that display a conic-gradient pie chart (fuel types as slices, colored by cheapest station price level) and a center badge showing the cluster's station count. Use the `clusterIconCreateFunction` option of `L.markerClusterGroup`.

**Tech Stack:** React, Leaflet, leaflet.markercluster

## Current State

- Clusters use the default `MarkerCluster.Default.css` styling (colored circles with a number)
- Individual stations use pie chart icons from `getFuelPieIcon()` in `mapIcons.js`
- `setupClusterCaptureListener` uses MutationObserver to intercept clicks on `.marker-cluster` DOM nodes
- Clicking a cluster: zooms to bounds + selects the first station in the cluster

## Design

### Visual Distinction: Cluster vs Individual Station

| Property | Individual Station | Cluster |
|----------|-------------------|---------|
| Size | 28x28 px | 32x32 px |
| Shape | Circle (`border-radius: 50%`) | Rounded square (`border-radius: 8px`) |
| Border | 3px solid white | 4px solid white + double box-shadow |
| Center | Nothing | Badge with station count |

### Pie Chart for Clusters

- **Slices:** One per fuel type in `selectedFuelTypes` filter (1-3 slices)
- **Slice size:** Equal angular division (`360° / fuelTypes.length`)
- **Slice color:** Determined by `calculateAllPriceLevels()` for the **cheapest station in the cluster** for that fuel type
- **Price levels:** `low = #16a34a`, `medium = #f97316`, `high = #dc2626`

### Count Badge

- White circle, 20px diameter, with gray border
- Centered in the pie chart
- Bold black text showing the number of stations
- Semi-transparent background for readability

### Click Behavior

- **Cluster click:** Only zoom (`flyToBounds`). No station selection.
- Individual station click behavior: unchanged.

## Files

### New file: `frontend/src/components/Map/clusterIcons.js`
- Export `getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap)`
- Logic: compute cheapest price per fuel type across all cluster stations, look up price levels from `fuelLevelsMap`, build conic-gradient, render divIcon with count badge

### Modified file: `frontend/src/components/Map/MapMarkers.jsx`
- Import `getClusterIcon` from `clusterIcons.js`
- Pass `clusterIconCreateFunction` to `L.markerClusterGroup`
- Remove `setupClusterCaptureListener` and the MutationObserver — replace with `onAdd` event on cluster group to attach click handlers
- Remove `MarkerCluster.Default.css` import (no longer needed)
- Remove `clusterCaptureObserverRef`, `setupClusterCaptureListener` function
- Add click handler on `.marker-cluster` elements created by the custom icon function

### Modified file: `frontend/src/components/Map/mapIcons.js`
- No changes needed for cluster icons (fuelLevelsMap passed in from caller)
- `calculateAllPriceLevels` is already exported and usable by `clusterIcons.js`

### Modified file: `frontend/src/App.jsx`
- Update `handleClusterClick` to only perform zoom (via a new callback `onClusterZoom`) — remove station selection logic
- Actually: the cluster click handling is in MapMarkers.jsx. We just need to change what `onClusterClick` does. Currently it's called with clusterStations and selects station 0. New behavior: just call `map.flyToBounds` which is already done in the current handler. Remove `onClusterClick` prop and the station selection logic entirely.
- Remove `onClusterClick` from `MapMarkers` props in `App.jsx`

## Implementation Steps Summary

1. Create `clusterIcons.js` with `getClusterIcon` function
2. Update `MapMarkers.jsx`:
   - Add `clusterIconCreateFunction` to cluster group options
   - Remove MutationObserver / `setupClusterCaptureListener`
   - Attach click handlers via `onAdd` event on cluster elements
   - Remove `clusterCaptureObserverRef`, `setupClusterCaptureListener`
   - Remove `MarkerCluster.Default.css` import
   - Change cluster click to only zoom, no station selection
3. Update `App.jsx`:
   - Remove `handleClusterClick` and `onClusterClick` prop from `MapMarkers`
   - Remove `setSelectedStationSource('cluster')` logic
