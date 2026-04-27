import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

const MARKER_RADIUS = 8;
const MARKER_Z_INDEX = 900;

function AddressMarker({ location }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!location) return;

    let markerPane = map.getPane('address-marker-pane');
    if (!markerPane) {
      markerPane = map.createPane('address-marker-pane');
    }
    markerPane.style.zIndex = MARKER_Z_INDEX;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    markerRef.current = L.circleMarker([location.lat, location.lng], {
      radius: MARKER_RADIUS,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 1,
      weight: 3,
      opacity: 1,
      pane: 'address-marker-pane',
    }).addTo(map);

    markerRef.current.bringToFront();
    markerRef.current.getElement().style.pointerEvents = 'none';
  }, [location, map]);

  useEffect(() => {
    return () => {
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [map]);

  return null;
}

export default AddressMarker;
