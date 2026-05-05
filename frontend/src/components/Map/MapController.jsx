import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { mapAnimatingRef, stationPopupOpenRef } from './mapInteractionState';

const MapController = ({ station, source, isMobile }) => {
  const map = useMap();
  const moveendHandlerRef = useRef(null);
  const popupStationRef = useRef(null);

  useEffect(() => {
    if (!station) return;

    const currentCenter = map.getCenter();
    const targetZoom = Math.max(map.getZoom(), 15);

    const currentLatLng = L.latLng(currentCenter.lat, currentCenter.lng);
    const targetLatLng = L.latLng(station.lat, station.lng);
    const distanceKm = currentLatLng.distanceTo(targetLatLng) / 1000;

    const distanceDuration = 0.5 + distanceKm / 60;

    let targetCenter = [station.lat, station.lng];

    // On mobile: offset center so station appears in middle of visible area
    // (below header, not at geometric center hidden by header)
    if (isMobile) {
      const mapEl = map.getContainer();
      const headerEl = document.querySelector('.app-header');
      if (mapEl && headerEl) {
        const headerHeight = headerEl.getBoundingClientRect().height;
        const pixelOffset = headerHeight / 2;

        // Project station to target zoom, shift projected Y upward (so station appears lower on screen)
        const projected = map.project(targetLatLng, targetZoom);
        const adjustedProjected = L.point(projected.x, projected.y - pixelOffset);
        const adjustedLatLng = map.unproject(adjustedProjected, targetZoom);
        targetCenter = [adjustedLatLng.lat, adjustedLatLng.lng];
      }
    }

    if (source === 'cluster') {
      return;
    }
    map.flyTo(targetCenter, targetZoom, {
      duration: Math.min(distanceDuration, 5),
      easeLinearity: 0.25
    });

    mapAnimatingRef.current = true;
    popupStationRef.current = station;

    moveendHandlerRef.current = () => {
      map.off('moveend', moveendHandlerRef.current);

      if (popupStationRef.current) {
        const { lat, lng } = popupStationRef.current;
        let popupOpened = false;
        map.eachLayer((layer) => {
          const pos = layer.getLatLng ? layer.getLatLng() : null;
          if (pos && Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
            if (layer.isPopupOpen()) return;
            if (layer.getPopup()) {
              layer.openPopup();
            } else if (layer._popupContent) {
               L.popup()
                 .setLatLng(layer.getLatLng())
                 .setContent(layer._popupContent)
                 .openOn(map);
             }
            popupOpened = true;
            popupStationRef.current = null;
          }
       });

        if (popupOpened) {
          stationPopupOpenRef.current = true;
        }
      }
      mapAnimatingRef.current = false;
    };

    map.on('moveend', moveendHandlerRef.current);

    return () => {
      if (moveendHandlerRef.current) {
        map.off('moveend', moveendHandlerRef.current);
      }
    };
  }, [station, source, isMobile, map]);

  return null;
};

export default MapController;
