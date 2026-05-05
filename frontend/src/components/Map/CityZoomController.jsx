import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import { clusterFlyToState } from './mapInteractionState';

const CITY_ZOOM = 12;

function CityZoomController({ city }) {
  const map = useMap();
  const lastCenterRef = useRef(null);
  useEffect(() => {
    if (!city) return;
    if (clusterFlyToState.active) return;
    if (lastCenterRef.current?.lat === city.lat && lastCenterRef.current?.lng === city.lng && map.getZoom() >= CITY_ZOOM) return;
    lastCenterRef.current = { lat: city.lat, lng: city.lng };
    map.setView([city.lat, city.lng], CITY_ZOOM, { animate: true, duration: 1 });
  }, [city, map]);
  return null;
}

export default CityZoomController;
