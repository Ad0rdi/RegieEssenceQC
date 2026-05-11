import { useMap } from 'react-leaflet';
import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { calculateAllPriceLevels, getFuelPieIcon } from './mapIcons';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { getClusterIcon } from './clusterIcons';
import { pendingMarkerClickState } from './mapInteractionState';
import { clusterFlyToState } from './mapInteractionState';

function formatPopupHTML(station, selectedFuelTypes) {
  const prices = station.prices || {};
  const fuelLabels = {
    regular: 'Régulier',
    super: 'Super',
    diesel: 'Diesel'
  };

  const priceEntries = Object.entries(prices)
    .filter(([type]) => {
      if (!selectedFuelTypes || selectedFuelTypes.length === 0) return true;
      return selectedFuelTypes.some(ft => type.toLowerCase().includes(ft));
    })
    .map(([type, price]) => {
      const label = fuelLabels[type] || type;
      const display = price != null ? `$${price.toFixed(3)} / L` : 'N/A';
      return `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0">
        <span>${label}:</span><span style="font-weight:600">${display}</span>
      </div>`;
    });

  return `<div style="font-family:sans-serif;font-size:13px;padding:4px 0;min-width:180px">
    <strong style="font-size:14px">${station.brand || 'N/A'}</strong>
    <div style="color:#666;margin:2px 0">${station.name || 'N/A'}</div>
    <div style="color:#666;margin:2px 0">${station.address || 'N/A'}</div>
    <hr style="border:none;border-top:1px solid #e5e4e7;margin:6px 0">
    ${priceEntries.join('')}
  </div>`;
}

function MapMarkers({ stations, selectedStationId, onStationClick, selectedFuelTypes }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);
  const onStationClickRef = useRef(onStationClick);
  const clusterClickHandlerRef = useRef(null);
  const [viewportBounds, setViewportBounds] = useState(null);

  // Keep callback refs up to date without triggering effect re-runs
  useEffect(() => {
    onStationClickRef.current = onStationClick;
  }, [onStationClick]);

  // Clear cluster flyTo flag on map moveend
  useEffect(() => {
    const onClusterFlyMoveEnd = () => {
      clusterFlyToState.active = false;
      map.off('moveend', onClusterFlyMoveEnd);
    };
    map.on('moveend', onClusterFlyMoveEnd);
    return () => map.off('moveend', onClusterFlyMoveEnd);
  }, [map]);

  // Track viewport bounds on map moveend
  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();
      setViewportBounds([
        bounds.getSouthWest().lat,
        bounds.getSouthWest().lng,
        bounds.getNorthEast().lat,
        bounds.getNorthEast().lng,
      ]);
    };
    map.on('moveend', updateBounds);
    updateBounds();
    return () => {
      map.off('moveend', updateBounds);
    };
  }, [map]);

  // Filter stations by viewport bounds
  const visibleStations = useMemo(() => {
    if (!viewportBounds || viewportBounds.length < 4) return stations;
    
    const southWest = L.latLng(viewportBounds[0], viewportBounds[1]);
    const northEast = L.latLng(viewportBounds[2], viewportBounds[3]);
    const bounds = L.latLngBounds(southWest, northEast);
    
    return stations.filter(station => {
      const point = L.latLng(station.lat, station.lng);
      return bounds.contains(point);
    });
  }, [stations, viewportBounds]);

  // Create a stable key from station data to trigger recreation only when markers change
  const dataKey = visibleStations?.map(s => `${s.id}-${s.lat}-${s.lng}`).sort().join('|') || '';
  const fuelKey = selectedFuelTypes?.sort().join('|') || '';

  useEffect(() => {
    const fuelLevelsMap = calculateAllPriceLevels(stations, selectedFuelTypes);
   if (!clusterGroupRef.current || !map.hasLayer(clusterGroupRef.current)) {
 const newClusterGroup = L.markerClusterGroup({
          maxClusterRadius: 50,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          zoomToBoundsOnClick: false,
          iconCreateFunction: (cluster) => {
            const childMarkers = cluster.getAllChildMarkers();
            const clusterStations = childMarkers
              .map(m => m._stationData)
              .filter(s => s != null);
            return getClusterIcon(clusterStations, selectedFuelTypes, fuelLevelsMap);
          },
        });
      clusterGroupRef.current = newClusterGroup;
      map.addLayer(newClusterGroup);
    }

   // Bind cluster click handler using Leaflet's clusterclick event on the cluster group
    const group = clusterGroupRef.current;
const clusterClickHandler = (e) => {
      L.DomEvent.preventDefault(e);
      if (pendingMarkerClickState.suppressClickRef.current) {
        pendingMarkerClickState.suppressClickRef.current = false;
        if (pendingMarkerClickState.timeoutRef.current) {
          clearTimeout(pendingMarkerClickState.timeoutRef.current);
          pendingMarkerClickState.timeoutRef.current = null;
        }
        pendingMarkerClickState.ref.current = null;
        return;
      }
      if (pendingMarkerClickState.timeoutRef.current && pendingMarkerClickState.ref.current !== true) {
        clearTimeout(pendingMarkerClickState.timeoutRef.current);
        pendingMarkerClickState.timeoutRef.current = null;
        pendingMarkerClickState.suppressClickRef.current = true;
      }
      if (pendingMarkerClickState.timeoutRef.current) {
        clearTimeout(pendingMarkerClickState.timeoutRef.current);
        pendingMarkerClickState.timeoutRef.current = null;
      }
      const cluster = e.layer;
      pendingMarkerClickState.ref.current = true;
      pendingMarkerClickState.timeoutRef.current = setTimeout(() => {
        if (pendingMarkerClickState.suppressClickRef.current) {
          pendingMarkerClickState.suppressClickRef.current = false;
          pendingMarkerClickState.timeoutRef.current = null;
          pendingMarkerClickState.ref.current = null;
          return;
        }
        if (pendingMarkerClickState.touchPhaseRef.current === 'ZOOM_DRAG') {
          pendingMarkerClickState.timeoutRef.current = null;
          pendingMarkerClickState.ref.current = null;
          return;
        }
        // Zoom to cluster bounds with animation
        const clusterBounds = cluster.getBounds ? cluster.getBounds() : null;
        if (clusterBounds) {
          clusterFlyToState.active = true;
          map.flyToBounds(clusterBounds, { padding: [70, 70], maxZoom: 18, duration: 1 });
        }
        pendingMarkerClickState.timeoutRef.current = null;
        pendingMarkerClickState.ref.current = null;
      }, pendingMarkerClickState.ZOOM_DRAG_TIMEOUT);
    };
if (clusterClickHandlerRef.current) {
        group.off('clusterclick', clusterClickHandlerRef.current);
      }
      clusterClickHandlerRef.current = clusterClickHandler;
      group.on('clusterclick', clusterClickHandler);

    clusterGroupRef.current.clearLayers();

     visibleStations.forEach((station) => {
       const markerOptions = { icon: getFuelPieIcon(selectedFuelTypes, fuelLevelsMap, station.id) };
       const popupContent = formatPopupHTML(station, selectedFuelTypes);
       const marker = L.marker(
          [station.lat, station.lng],
          markerOptions
        );
        marker._stationData = station;
        marker._popupContent = popupContent;
marker.on('click', (e) => {
         L.DomEvent.stopPropagation(e);
         if (pendingMarkerClickState.suppressClickRef.current) {
           pendingMarkerClickState.suppressClickRef.current = false;
           if (pendingMarkerClickState.timeoutRef.current) {
             clearTimeout(pendingMarkerClickState.timeoutRef.current);
             pendingMarkerClickState.timeoutRef.current = null;
           }
           pendingMarkerClickState.ref.current = null;
           return;
         }
         if (pendingMarkerClickState.timeoutRef.current && pendingMarkerClickState.ref.current === true) {
           clearTimeout(pendingMarkerClickState.timeoutRef.current);
           pendingMarkerClickState.timeoutRef.current = null;
           pendingMarkerClickState.suppressClickRef.current = true;
         }
         if (pendingMarkerClickState.timeoutRef.current) {
           clearTimeout(pendingMarkerClickState.timeoutRef.current);
           pendingMarkerClickState.timeoutRef.current = null;
         }
         pendingMarkerClickState.ref.current = marker;
        pendingMarkerClickState.timeoutRef.current = setTimeout(() => {
          if (pendingMarkerClickState.suppressClickRef.current) {
            pendingMarkerClickState.suppressClickRef.current = false;
            pendingMarkerClickState.timeoutRef.current = null;
            pendingMarkerClickState.ref.current = null;
            return;
          }
          if (pendingMarkerClickState.touchPhaseRef.current === 'ZOOM_DRAG') {
            pendingMarkerClickState.timeoutRef.current = null;
            pendingMarkerClickState.ref.current = null;
            return;
          }
          onStationClickRef.current(station);
          pendingMarkerClickState.timeoutRef.current = null;
          pendingMarkerClickState.ref.current = null;
        }, pendingMarkerClickState.ZOOM_DRAG_TIMEOUT);
      });

      clusterGroupRef.current.addLayer(marker);
    });

    // Also add the selected station marker even if outside viewport bounds
    if (selectedStationId) {
      const selectedInCluster = visibleStations.some(s => s.id === selectedStationId);
      if (!selectedInCluster) {
        const selected = stations.find(s => s.id === selectedStationId);
        if (selected) {
          const markerOptions = { icon: getFuelPieIcon(selectedFuelTypes, fuelLevelsMap, selected.id) };
          const popupContent = formatPopupHTML(selected, selectedFuelTypes);
          const marker = L.marker([selected.lat, selected.lng], markerOptions);
          marker._stationData = selected;
          marker._popupContent = popupContent;
          clusterGroupRef.current.addLayer(marker);
        }
      }
    }

    return () => {
      if (clusterGroupRef.current && clusterClickHandlerRef.current) {
        clusterGroupRef.current.off('clusterclick', clusterClickHandlerRef.current);
      }
      if (clusterGroupRef.current && map.hasLayer(clusterGroupRef.current)) {
        map.removeLayer(clusterGroupRef.current);
      }
      if (pendingMarkerClickState.timeoutRef.current) {
        clearTimeout(pendingMarkerClickState.timeoutRef.current);
        pendingMarkerClickState.timeoutRef.current = null;
      }
      pendingMarkerClickState.ref.current = null;
    };
  }, [dataKey, fuelKey, visibleStations, stations, selectedFuelTypes, selectedStationId, map]);

  return null;
}

export default MapMarkers;
