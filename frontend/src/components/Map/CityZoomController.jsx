import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

const CITY_ZOOM = 12;

function CityZoomController({ city }) {
  const map = useMap();
  useEffect(() => {
    if (city) {
      map.flyTo([city.lat, city.lng], CITY_ZOOM);
    }
  }, [city, map]);
  return null;
}

export default CityZoomController;
