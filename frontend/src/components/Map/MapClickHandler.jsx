import { useMap } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import L from 'leaflet';

const MapClickHandler = ({ onMapClick }) => {
  const map = useMap();
  const isMobile = useIsMobile();
  const onMapClickRef = useRef(onMapClick);
  const pendingLocationRef = useRef(null);
  const popupRef = useRef(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const stationPopupClosingRef = useRef(false);

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

      let hasOpenStationPopup = false;
      map.eachLayer((layer) => {
        if (layer.getPopup && !layer._isLocationPopup) {
          const popup = layer.getPopup();
          if (popup && popup.isOpen()) {
            hasOpenStationPopup = true;
          }
        }
      });

      if (hasOpenStationPopup) return;

      if (stationPopupClosingRef.current) {
        stationPopupClosingRef.current = false;
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

      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null;
        pendingLocationRef.current = null;
        setPendingLocation(null);
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

    const onPopupClose = () => {
      stationPopupClosingRef.current = true;
    };

    const onPreClick = () => {
      requestAnimationFrame(() => {
        stationPopupClosingRef.current = false;
      });
    };

    map.on('popupclose', onPopupClose);
    map.on('preclick', onPreClick);

    if (!isMobile) {
      map.on('click', handleMapClick);
    }

    if (isMobile) {
      map.on('contextmenu', handleContextmenu);
    }

    map.on('moveend zoomend', clearPopup);

    return () => {
      map.off('popupclose', onPopupClose);
      map.off('preclick', onPreClick);
      map.off('moveend zoomend', clearPopup);
      if (!isMobile) {
        map.off('click', handleMapClick);
      }
      if (isMobile) {
        map.off('contextmenu', handleContextmenu);
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
      .setContent(popupHtml)
      .addTo(map);

    popupRef.current = popup;
    popup._isLocationPopup = true;
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
