import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { calculateAllPriceLevels, getFuelPieIcon } from './mapIcons';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Module-level ref for MapController to reopen popup after flyTo animation
export const popupMarker = { ref: null };

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
    <strong style="font-size:14px">${station.name || 'N/A'}</strong>
    <div style="color:#666;margin:2px 0">${station.brand || 'N/A'}</div>
    <div style="color:#666;margin:2px 0">${station.address || 'N/A'}</div>
    <hr style="border:none;border-top:1px solid #e5e4e7;margin:6px 0">
    ${priceEntries.join('')}
  </div>`;
}

function MapMarkers({ stations, selectedStationId, onStationClick, selectedFuelTypes, selectedFuelType }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);
  const onStationClickRef = useRef(onStationClick);

  // Keep callback ref up to date without triggering effect re-runs
  useEffect(() => {
    onStationClickRef.current = onStationClick;
  }, [onStationClick]);

  // Create a stable key from station data to trigger recreation only when markers change
  const dataKey = stations?.map(s => `${s.id}-${s.lat}-${s.lng}`).sort().join('|') || '';
  const fuelKey = selectedFuelTypes?.sort().join('|') || '';

  useEffect(() => {
    // Create cluster group if needed, or recreate if cleanup removed it
    if (!clusterGroupRef.current || !map.hasLayer(clusterGroupRef.current)) {
      const newClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });
      clusterGroupRef.current = newClusterGroup;
      map.addLayer(newClusterGroup);
    }

    const fuelLevelsMap = calculateAllPriceLevels(stations, selectedFuelTypes);

    // Clear existing markers (doesn't destroy cluster group)
    clusterGroupRef.current.clearLayers();

    stations.forEach((station) => {
      const markerOptions = { icon: getFuelPieIcon(selectedFuelTypes, fuelLevelsMap, station.id) };
      const marker = L.marker(
        [station.lat, station.lng],
        markerOptions
      ).bindPopup(formatPopupHTML(station, selectedFuelTypes))
      .on('click', () => {
        onStationClickRef.current(station);
        popupMarker.ref = marker;
        marker.openPopup();
      });

      clusterGroupRef.current.addLayer(marker);
    });

    return () => {
      if (clusterGroupRef.current && map.hasLayer(clusterGroupRef.current)) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [dataKey, fuelKey, stations, selectedFuelTypes, selectedFuelType, map]);

  return null;
}

export default MapMarkers;
