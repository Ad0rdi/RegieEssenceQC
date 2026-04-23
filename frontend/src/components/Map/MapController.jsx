import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';

const MapController = ({ station }) => {
  const map = useMap();
  const moveendHandlerRef = useRef(null);
  const popupStationRef = useRef(null);

  useEffect(() => {
    if (!station) return;

    const currentZoom = map.getZoom();
    const targetZoom = 15;

    // Skip zoom if already zoomed in — avoid panInside closing the popup
    if (currentZoom >= targetZoom) {
      return;
    }

    map.flyTo([station.lat, station.lng], targetZoom, {
      duration: 1.0,
      easeLinearity: 0.25
    });

    // Store station to reopen popup after animation
    popupStationRef.current = station;

    moveendHandlerRef.current = () => {
      map.off('moveend', moveendHandlerRef.current);

      if (popupStationRef.current) {
        const { lat, lng } = popupStationRef.current;
        map.eachLayer((layer) => {
          const pos = layer.getLatLng ? layer.getLatLng() : null;
          if (pos && Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
            if (layer.getPopup() && !layer.isPopupOpen()) {
              layer.openPopup();
            }
            popupStationRef.current = null;
          }
        });
      }
    };

    map.on('moveend', moveendHandlerRef.current);

    return () => {
      if (moveendHandlerRef.current) {
        map.off('moveend', moveendHandlerRef.current);
      }
    };
  }, [station, map]);

  return null;
};

export default MapController;
