import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

const MapController = ({ station, source }) => {
  const map = useMap();
  const moveendHandlerRef = useRef(null);
  const popupStationRef = useRef(null);

  useEffect(() => {
    if (!station) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const targetZoom = 15;

    // Calculate actual distance in km between current center and station
    const currentLatLng = L.latLng(currentCenter.lat, currentCenter.lng);
    const targetLatLng = L.latLng(station.lat, station.lng);
    const distanceKm = currentLatLng.distanceTo(targetLatLng) / 1000;

    // Scale duration based on distance (base 0.5s, ~100km adds 1s)
    const distanceDuration = 0.5 + distanceKm / 60;

    // Drawer clicks always flyTo to zoom in; map clicks only pan if already zoomed in
    const isDrawerClick = source === 'drawer';
    const shouldZoom = isDrawerClick || currentZoom < targetZoom;

    if (!shouldZoom && currentZoom >= targetZoom) {
      map.panTo([station.lat, station.lng], { duration: 0.5 });
    } else {
      map.flyTo([station.lat, station.lng], targetZoom, {
        duration: Math.min(distanceDuration, 5),
        easeLinearity: 0.25
      });
    }

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
  }, [station, source, map]);

  return null;
};

export default MapController;
