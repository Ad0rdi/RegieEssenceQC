import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

const MapController = ({ station }) => {
  const map = useMap();
  useEffect(() => {
    if (station) {
      map.flyTo([station.lat, station.lng], 15);
    }
  }, [station, map]);
  return null;
};

export default MapController;
