import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

function UserLocationMarker({ location }) {
  const map = useMap();
  const dotRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (!location) return;

    if (dotRef.current) map.removeLayer(dotRef.current);
    if (circleRef.current) map.removeLayer(circleRef.current);

    circleRef.current = L.circle([location.lat, location.lng], {
      radius: location.accuracy,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 1,
      opacity: 0.3,
    }).addTo(map);

    dotRef.current = L.circleMarker([location.lat, location.lng], {
      radius: 6,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
      weight: 2,
      opacity: 1,
    }).addTo(map);
  }, [location, map]);

  useEffect(() => {
    return () => {
      if (dotRef.current) map.removeLayer(dotRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
    };
  }, [map]);

  return null;
}

export default UserLocationMarker;
