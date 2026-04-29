import { useMap } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import L from 'leaflet';

const LONG_PRESS_THRESHOLD = 300;

const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();
  const isMobile = useIsMobile();
  const onMapClickRef = useRef(onMapClick);
  const pendingLocationRef = useRef(null);
  const popupRef = useRef(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const stationPopupOpenRef = useRef(false);
  const pressStartTimeRef = useRef(0);
  const clickHandlerRef = useRef(null);
  const pressStartRef = useRef(null);

  useEffect(() => {
    onMapClickRef.current = onMapClick;

    const handleMapClick = (e) => {
      const target = e.originalEvent.target;
      const controlClasses = [
        'leaflet-marker-icon',
        'leaflet-control',
        'leaflet-gps-btn',
        'leaflet-custom-zoom',
        'leaflet-bar',
      ];
      for (const cls of controlClasses) {
        if (target.classList?.contains(cls)) return;
      }
      const el = target.closest?.('.leaflet-control, .leaflet-gps-btn, .leaflet-custom-zoom, .leaflet-bar, .leaflet-marker-icon');
      if (el) return;

      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
        pendingLocationRef.current = null;
        setPendingLocation(null);
        return;
      }

      if (stationPopupOpenRef.current) {
        stationPopupOpenRef.current = false;
        return;
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      pendingLocationRef.current = { lat, lng };
      setPendingLocation({ lat, lng });
    };

    const handleContextmenu = (e) => {
      const target = e.originalEvent.target;
      const controlClasses = [
        'leaflet-marker-icon',
        'leaflet-control',
        'leaflet-gps-btn',
        'leaflet-custom-zoom',
        'leaflet-bar',
      ];
      for (const cls of controlClasses) {
        if (target.classList?.contains(cls)) return;
      }
      const el = target.closest?.('.leaflet-control, .leaflet-gps-btn, .leaflet-custom-zoom, .leaflet-bar, .leaflet-marker-icon');
      if (el) return;

      e.originalEvent.preventDefault();

      const elapsed = Date.now() - pressStartTimeRef.current;
      if (elapsed < LONG_PRESS_THRESHOLD) return;

      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
        pendingLocationRef.current = null;
        setPendingLocation(null);
        return;
      }

      if (stationPopupOpenRef.current) {
        stationPopupOpenRef.current = false;
        return;
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      pendingLocationRef.current = { lat, lng };
      setPendingLocation({ lat, lng });
    };

    const clearPopup = () => {
      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
      }
      pendingLocationRef.current = null;
      setPendingLocation(null);
    };

    const onPopupOpen = (e) => {
      if (!e.popup || e.popup._isLocationPopup) return;
      stationPopupOpenRef.current = true;
    };

    const onPopupClose = (e) => {
      if (!e.popup || e.popup._isLocationPopup) return;
      Promise.resolve().then(() => {
        stationPopupOpenRef.current = false;
      });
    };

    // Mobile tap handler: closes popup only, never opens
    clickHandlerRef.current = (e) => {
      const target = e.originalEvent.target;
      const controlClasses = [
        'leaflet-marker-icon',
        'leaflet-control',
        'leaflet-gps-btn',
        'leaflet-custom-zoom',
        'leaflet-bar',
      ];
      for (const cls of controlClasses) {
        if (target.classList?.contains(cls)) return;
      }
      const el = target.closest?.('.leaflet-control, .leaflet-gps-btn, .leaflet-custom-zoom, .leaflet-bar, .leaflet-marker-icon');
      if (el) return;

      // Tap = close only
      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
        pendingLocationRef.current = null;
        setPendingLocation(null);
      }
    };

    // Touch start: records press time for long press detection
    pressStartRef.current = () => {
      pressStartTimeRef.current = Date.now();
    };

    if (!isMobile) {
      map.on('click', handleMapClick);
    }

    if (isMobile) {
      map.on('click', clickHandlerRef.current);
      map.on('contextmenu', handleContextmenu);
      map.on('touchstart mousedown', pressStartRef.current);
    }

    map.on('popupopen', onPopupOpen);
    map.on('popupclose', onPopupClose);
    map.on('moveend zoomend', clearPopup);

    return () => {
      map.off('popupopen', onPopupOpen);
      map.off('popupclose', onPopupClose);
      map.off('moveend zoomend', clearPopup);
      if (!isMobile) {
        map.off('click', handleMapClick);
      }
      if (isMobile) {
        map.off('click', clickHandlerRef.current);
        map.off('contextmenu', handleContextmenu);
        map.off('touchstart mousedown', pressStartRef.current);
      }
      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
      }
    };
  }, [map, isMobile]);

  const handleConfirm = () => {
    const location = pendingLocationRef.current;
    if (!location) return;
    onMapClickRef.current({ lat: location.lat, lng: location.lng, source: 'map' });
    if (popupRef.current) {
      map.removeLayer(popupRef.current);
      popupRef.current = null;
    }
    pendingLocationRef.current = null;
    setPendingLocation(null);
  };

  const handleDismiss = () => {
    if (popupRef.current) {
      map.removeLayer(popupRef.current);
      popupRef.current = null;
    }
    pendingLocationRef.current = null;
    setPendingLocation(null);
  };

  useEffect(() => {
    if (!pendingLocation) return;

    const popupHtml = `
      <div class="map-confirm-popup">
        <p class="map-confirm-text">Choisir comme référence?</p>
        <div class="map-confirm-buttons">
          <button class="map-confirm-btn map-confirm-yes">Oui</button>
          <button class="map-confirm-btn map-confirm-no">Non</button>
        </div>
      </div>
    `;

    const popup = L.popup({
      closeButton: false,
      autoPan: false,
      className: 'map-confirm-popup-container',
    })
      .setLatLng([pendingLocation.lat, pendingLocation.lng])
      .setContent(popupHtml);

    popup._isLocationPopup = true;
    popup.addTo(map);

    popupRef.current = popup;
    const popupEl = popup.getElement();
    if (popupEl) {
      L.DomEvent.disableClickPropagation(popupEl);
      L.DomEvent.disableScrollPropagation(popupEl);
    }

    const yesBtn = popup.getElement()?.querySelector('.map-confirm-yes');
    const noBtn = popup.getElement()?.querySelector('.map-confirm-no');

    if (yesBtn) {
      L.DomEvent.on(yesBtn, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        e.stopImmediatePropagation();
        handleConfirm();
      });
      L.DomEvent.on(yesBtn, 'mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
      });
      L.DomEvent.on(yesBtn, 'mouseup', (e) => {
        L.DomEvent.stopPropagation(e);
      });
    }

    if (noBtn) {
      L.DomEvent.on(noBtn, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        e.stopImmediatePropagation();
        handleDismiss();
      });
      L.DomEvent.on(noBtn, 'mousedown', (e) => {
        L.DomEvent.stopPropagation(e);
      });
      L.DomEvent.on(noBtn, 'mouseup', (e) => {
        L.DomEvent.stopPropagation(e);
      });
    }

    return () => {
      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
      }
    };
  }, [pendingLocation, map]);

  return null;
};

export default MapClickHandler;
