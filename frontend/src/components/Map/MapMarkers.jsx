import { useMap } from 'react-leaflet';
import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { getFuelPieIcon } from './mapIcons';
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
  const manualMarkerRef = useRef(null);
  const manualLayerGroupRef = useRef(null);

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

  // Track viewport bounds on map moveend (RAF-throttled to reduce React renders during drag)
  const lastBoundsRef = useRef(null);
  const rafIdRef = useRef(null);
  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();
      const newBounds = [
        bounds.getSouthWest().lat,
        bounds.getSouthWest().lng,
        bounds.getNorthEast().lat,
        bounds.getNorthEast().lng,
      ];
      if (lastBoundsRef.current &&
          newBounds[0] === lastBoundsRef.current[0] &&
          newBounds[1] === lastBoundsRef.current[1] &&
          newBounds[2] === lastBoundsRef.current[2] &&
          newBounds[3] === lastBoundsRef.current[3]) {
        return;
      }
      lastBoundsRef.current = newBounds;
      const prevId = rafIdRef.current;
      if (prevId !== null) {
        cancelAnimationFrame(prevId);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        if (lastBoundsRef.current) {
          setViewportBounds(lastBoundsRef.current);
        }
        rafIdRef.current = null;
      });
    };
    map.on('moveend', updateBounds);
    updateBounds();
    return () => {
      map.off('moveend', updateBounds);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
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

  useEffect(() => {
    visibleStationsRef.current = visibleStations;
  }, [visibleStations]);

  const dataKey = stations?.map(s => `${s.id}-${s.lat}-${s.lng}`).sort().join('|') || '';
  const fuelKey = selectedFuelTypes?.sort().join('|') || '';

  const markersByStationIdRef = useRef(new Map());
  const stationBestPricesRef = useRef(new Map());
  const globalPriceRangeRef = useRef({});
  const visibleStationsRef = useRef([]);

  const stationBestPrices = useMemo(() => {
    const map = new Map();
    stations.forEach(s => {
      const prices = {};
      for (const ft of ['regular', 'super', 'diesel']) {
        const price = s.prices ? s.prices[ft] : null;
        if (price != null) {
          prices[ft] = price;
        }
      }
      map.set(s.id, prices);
    });
    return map;
  }, [stations]);

  const globalPriceRange = useMemo(() => {
    const range = {};
    selectedFuelTypes.forEach(ft => {
      let min = Infinity, max = -Infinity;
      stations.forEach(s => {
        const prices = stationBestPrices.get(s.id);
        if (prices && prices[ft] != null) {
          min = Math.min(min, prices[ft]);
          max = Math.max(max, prices[ft]);
        }
      });
      if (min !== Infinity && max !== -Infinity) {
        range[ft] = { min, max };
      }
    });
    return range;
  }, [stations, stationBestPrices, selectedFuelTypes]);

  useEffect(() => {
    globalPriceRangeRef.current = globalPriceRange;
  }, [globalPriceRange]);

 // Helper: create a single station marker
  function createStationMarker(station, selectedFuelTypes, globalPriceRange, stationBestPrices, popupContent) {
    const prices = stationBestPrices.get(station.id) || {};
    const markerOptions = { icon: getFuelPieIcon(selectedFuelTypes, station.prices, globalPriceRange) };
    const marker = L.marker(
      [station.lat, station.lng],
      markerOptions
    );
    marker._stationData = station;
    marker._stationPrices = prices;
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
    return marker;
  }

// Core: sync markers to/from cluster group (called synchronously for initial render,
// then via requestIdleCallback for subsequent updates)
  function syncMarkers(clusterGroup) {
    if (!clusterGroup) return;

    const existingIds = markersByStationIdRef.current;
    const currentVisibleStations = visibleStationsRef.current;
    const visibleIds = new Set(currentVisibleStations?.map(s => s.id) || []);

    // Phase 1: Remove markers no longer in viewport
    const toRemove = [];
    existingIds.forEach((val, id) => {
      if (!visibleIds.has(id)) toRemove.push(id);
    });
    toRemove.forEach(id => {
      const marker = existingIds.get(id);
      if (marker && clusterGroup.hasLayer(marker)) {
        clusterGroup.removeLayer(marker);
      }
      existingIds.delete(id);
    });

  // Phase 2: Add new markers (center-first, batch via L.layerGroup)
    let toAdd = currentVisibleStations?.filter(s => !existingIds.has(String(s.id))) || [];

    // Center-first: sort by distance to viewport center so center markers load first
    if (viewportBounds && viewportBounds.length === 4 && toAdd.length > 1) {
      const centerLat = (viewportBounds[0] + viewportBounds[2]) / 2;
      const centerLng = (viewportBounds[1] + viewportBounds[3]) / 2;
      toAdd.sort((a, b) => {
        const distA = (a.lat - centerLat) ** 2 + (a.lng - centerLng) ** 2;
        const distB = (b.lat - centerLat) ** 2 + (b.lng - centerLng) ** 2;
        return distA - distB;
      });
    }

    const newMarkers = [];
    for (const station of toAdd) {
      const popupContent = formatPopupHTML(station, selectedFuelTypes);
      const marker = createStationMarker(station, selectedFuelTypes, globalPriceRangeRef.current, stationBestPrices, popupContent);
      newMarkers.push(marker);
    }

    if (newMarkers.length > 0) {
      // Add all markers at once via L.layerGroup — triggers _recursivelyAddChildrenToMap
      // at the end, ensuring all markers render regardless of async timing
      const layerGroup = L.layerGroup(newMarkers);
      clusterGroup.addLayer(layerGroup);
      for (const marker of newMarkers) {
        existingIds.set(String(marker._stationData.id), marker);
      }
    }
  }

  // Effect 1: create cluster group (only when data/fuel types change, NOT on zoom/viewport)
  useEffect(() => {
    if (clusterGroupRef.current && map.hasLayer(clusterGroupRef.current)) {
      map.removeLayer(clusterGroupRef.current);
    }

    const iconCache = new Map();

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
        const count = clusterStations.length;

        const cacheKey = `${count}-${clusterStations.map(s => s.id).sort().join(',')}`;
        const cached = iconCache.get(cacheKey);
        if (cached) return cached;

        const clusterMinPrices = {};
        for (const ft of selectedFuelTypes) {
          let min = Infinity;
          for (const m of childMarkers) {
            const prices = m._stationPrices;
            if (prices && prices[ft] != null && prices[ft] < min) {
              min = prices[ft];
            }
          }
          if (min !== Infinity) clusterMinPrices[ft] = min;
        }

        const icon = getClusterIcon(clusterStations, selectedFuelTypes, globalPriceRange, clusterMinPrices);
        iconCache.set(cacheKey, icon);
        return icon;
      },
    });
    clusterGroupRef.current = newClusterGroup;
    map.addLayer(newClusterGroup);

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

    markersByStationIdRef.current.clear();

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
  }, [dataKey, fuelKey, stations, selectedFuelTypes, map, globalPriceRange]);

 // Effect 2: sync markers to viewport (deferred via requestIdleCallback)
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    const doSync = () => {
      if (!selectedFuelTypes || selectedFuelTypes.length === 0) {
        const existingIds = markersByStationIdRef.current;
        existingIds.forEach((marker) => {
          if (marker && clusterGroup.hasLayer(marker)) {
            clusterGroup.removeLayer(marker);
          }
        });
        existingIds.clear();
        return;
      }

      syncMarkers(clusterGroup);
    };

    // First sync: run synchronously so initial viewport stations appear immediately
    // Subsequent syncs (viewport changes): defer so browser can paint first
    if (markersByStationIdRef.current.size === 0) {
      doSync();
    } else {
      // Defer to next task so browser can paint first
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(doSync, { timeout: 100 });
      } else {
        setTimeout(doSync, 0);
      }
    }

    // Handle selected station marker separately (outside cluster group)
    const manualLayerGroup = manualLayerGroupRef.current;
    const oldManualMarker = manualMarkerRef.current;
    
    if (selectedStationId) {
      const selected = stations.find(s => s.id === selectedStationId);
      if (selected) {
        if (!oldManualMarker) {
          const popupContent = formatPopupHTML(selected, selectedFuelTypes);
          const marker = createStationMarker(selected, selectedFuelTypes, globalPriceRangeRef.current, stationBestPricesRef.current, popupContent);
          manualMarkerRef.current = marker;
          if (!manualLayerGroup) {
            const layerGroup = L.layerGroup();
            manualLayerGroupRef.current = layerGroup;
            map.addLayer(layerGroup);
          }
          manualLayerGroupRef.current.addLayer(marker);
        } else {
          manualMarkerRef.current.setLatLng([selected.lat, selected.lng]);
        }
      }
    } else if (oldManualMarker) {
      if (manualLayerGroup && map.hasLayer(manualLayerGroup)) {
        map.removeLayer(manualLayerGroup);
      }
      manualMarkerRef.current = null;
      manualLayerGroupRef.current = null;
    }

    return () => {
      if (manualLayerGroupRef.current && map.hasLayer(manualLayerGroupRef.current)) {
        map.removeLayer(manualLayerGroupRef.current);
      }
      manualMarkerRef.current = null;
      manualLayerGroupRef.current = null;
    };
  }, [visibleStations, stations, selectedFuelTypes, selectedStationId, viewportBounds, map, syncMarkers]);

  return null;
}

export default MapMarkers;
