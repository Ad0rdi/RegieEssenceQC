import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();
  const isMobile = useIsMobile();
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    const handleMapClick = (e) => {
      if (e.originalEvent.target?.classList?.contains('leaflet-marker-icon')) {
        return;
      }
      onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng, source: 'map' });
    };

    const handleContextmenu = (e) => {
      if (e.originalEvent.target?.classList?.contains('leaflet-marker-icon')) {
        return;
      }
      e.originalEvent.preventDefault();
      onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng, source: 'map' });
    };

    map.on('click', handleMapClick);

    if (isMobile) {
      map.on('contextmenu', handleContextmenu);
    }

    return () => {
      map.off('click', handleMapClick);
      if (isMobile) {
        map.off('contextmenu', handleContextmenu);
      }
    };
  }, [map, isMobile]);

  return null;
};

export default MapClickHandler;
