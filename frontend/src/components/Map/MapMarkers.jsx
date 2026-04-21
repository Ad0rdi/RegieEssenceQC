import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { selectedIcon, calculatePriceLevels, getPriceLevelIcon, getFuelPieIcon } from './mapIcons';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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
      const display = price != null ? `$${price.toFixed(2)} / L` : 'N/A';
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

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    const levelsMap = calculatePriceLevels(stations, selectedFuelType);

    stations.forEach((station) => {
      const isStationSelected = selectedStationId === station.id;
      let markerOptions = {};
      if (isStationSelected) {
        markerOptions = { icon: selectedIcon };
      } else {
        markerOptions = { icon: getFuelPieIcon(selectedFuelTypes) };
      }
      const marker = L.marker(
        [station.lat, station.lng],
        markerOptions
      ).bindPopup(formatPopupHTML(station, selectedFuelTypes))
      .on('click', () => onStationClick(station));

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [stations, selectedStationId, onStationClick, selectedFuelTypes, selectedFuelType, map]);

  return null;
}

export default MapMarkers;
