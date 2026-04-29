import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

const GREEN_PIN_HTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.8 12.5 28.5 12.5 28.5S25 22.3 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#3b82f6"/>
    <circle cx="12.5" cy="13" r="5" fill="white"/>
  </svg>
`;

const ManualLocationIcon = L.divIcon({
  className: 'manual-location-marker',
  html: GREEN_PIN_HTML,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function ManualLocationMarker({ location }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!location) return;

    const rawMap = map;

    let markerPane = rawMap.getPane('manual-marker-pane');
    if (!markerPane) {
      markerPane = rawMap.createPane('manual-marker-pane');
    }
    markerPane.style.zIndex = 650;

    if (markerRef.current) {
      rawMap.removeLayer(markerRef.current);
    }

    const marker = L.marker([location.lat, location.lng], {
      icon: ManualLocationIcon,
      pane: 'manual-marker-pane',
    });

    rawMap.addLayer(marker);
    markerRef.current = marker;
  }, [location, map]);

  useEffect(() => {
    return () => {
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [map]);

  return null;
}

export default ManualLocationMarker;
