import { useMap } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import L from 'leaflet';

const LONG_PRESS_THRESHOLD = 300;
const PINCH_BASE_DISTANCE = 100;
const PINCH_ZOOM_SENSITIVITY = 0.8;
const ZOOM_DRAG_TIMEOUT = 250;
const TAP_DRAG_THRESHOLD = 30;

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
  const touchPhaseRef = useRef('IDLE');
  const pinchBaseYRef = useRef(null);
  const pinchCenterLatlngRef = useRef(null);
  const baseZoomRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const firstTapPosRef = useRef(null);
  const firstTapMovedRef = useRef(false);
  const zoomTimeoutRef = useRef(null);

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

   // Check if touch target is on the map (not on controls, buttons, markers, etc)
    const isOnMap = (target) => {
      const controlClasses = [
        'leaflet-marker-icon',
        'leaflet-control',
        'leaflet-gps-btn',
        'leaflet-custom-zoom',
        'leaflet-bar',
      ];
      for (const cls of controlClasses) {
        if (target.classList?.contains(cls)) return false;
      }
      const el = target.closest?.('.leaflet-control, .leaflet-gps-btn, .leaflet-custom-zoom, .leaflet-bar, .leaflet-marker-icon');
      return !el;
    };

    // Touch handler for DOM container - handles double-tap-drag-to-zoom (pinch emulation)
    const containerTouchHandler = (e) => {
      if (isMobile !== true) {
        console.log('[zoom] not mobile, skip', { isMobile });
        return;
      }
      if (e.touches?.length > 1) {
        console.log('[zoom] multi-touch, skip', { touches: e.touches.length });
        return;
      }

      if (e.type === 'touchstart') {
        const target = e.target || e.originalEvent?.target;
        if (!isOnMap(target)) {
          console.log('[zoom] touchstart: target is not on map', { target: target?.classList?.toString() });
          return;
        }
        if (touchPhaseRef.current === 'ZOOM_DRAG') {
          console.log('[zoom] touchstart: already ZOOM_DRAG, skip');
          return;
        }

        const now = Date.now();
        const elapsed = now - lastTapTimeRef.current;
        const firstMoved = firstTapMovedRef.current;
        const firstPos = firstTapPosRef.current;

        console.log('[zoom] touchstart: phase', touchPhaseRef.current, 'elapsed', elapsed, 'timeout', ZOOM_DRAG_TIMEOUT, 'lastTapTime', lastTapTimeRef.current, 'firstMoved', firstMoved, 'firstPos', firstPos);

        if (elapsed < ZOOM_DRAG_TIMEOUT && lastTapTimeRef.current > 0 && !firstMoved && firstPos) {
          console.log('[zoom] touchstart: DOUBLE TAP -> ZOOM_DRAG mode!');
          touchPhaseRef.current = 'ZOOM_DRAG';
          pinchBaseYRef.current = e.touches[0].clientY;
          const containerPoint = map.containerPointToLatLng([e.touches[0].clientX, e.touches[0].clientY]);
          pinchCenterLatlngRef.current = containerPoint;
          baseZoomRef.current = map.getZoom();
          map.dragging.disable();
          firstTapPosRef.current = null;
          firstTapMovedRef.current = false;
          e.preventDefault();
        } else {
          console.log('[zoom] touchstart: FIRST TAP, storing pos');
          firstTapPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          firstTapMovedRef.current = false;
          lastTapTimeRef.current = now;
        }

        if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => {
          if (touchPhaseRef.current === 'ZOOM_DRAG') return;
          console.log('[zoom] timeout fired, resetting');
          touchPhaseRef.current = 'IDLE';
          firstTapPosRef.current = null;
          firstTapMovedRef.current = false;
          zoomTimeoutRef.current = null;
        }, ZOOM_DRAG_TIMEOUT);
      } else if (e.type === 'touchmove') {
        console.log('[zoom] touchmove: phase', touchPhaseRef.current, 'pinchBaseY', pinchBaseYRef.current);
        if (touchPhaseRef.current === 'ZOOM_DRAG') {
          const currentY = e.touches[0].clientY;
          const deltaY = currentY - pinchBaseYRef.current;
          const zoomDelta = Math.sqrt(Math.abs(deltaY) / PINCH_BASE_DISTANCE) * PINCH_ZOOM_SENSITIVITY * Math.sign(deltaY);
          const targetZoom = baseZoomRef.current + zoomDelta;
          const minZoom = map.getMinZoom();
          const maxZoom = map.getMaxZoom() ?? 19;
          const newZoom = Math.min(Math.max(targetZoom, minZoom), maxZoom);
          const currentZoom = map.getZoom();

          if (Math.abs(newZoom - currentZoom) > 0.01) {
            e.preventDefault();
            e.stopPropagation();
         const zoomCenter = pinchCenterLatlngRef.current ?? map.getCenter();
            map.setView(zoomCenter, newZoom, { animate: false });
          }
        } else if (firstTapPosRef.current) {
          const dx = Math.abs(e.touches[0].clientX - firstTapPosRef.current.x);
          const dy = Math.abs(e.touches[0].clientY - firstTapPosRef.current.y);
          if (dx > TAP_DRAG_THRESHOLD || dy > TAP_DRAG_THRESHOLD) {
            console.log('[zoom] touchmove: first tap moved (drag), firstMoved = true');
            firstTapMovedRef.current = true;
          }
        }
      } else if (e.type === 'touchend') {
        console.log('[zoom] touchend: phase', touchPhaseRef.current);
       if (touchPhaseRef.current === 'ZOOM_DRAG') {
          console.log('[zoom] touchend: zoom drag ended, re-enabling dragging');
          touchPhaseRef.current = 'IDLE';
          map.dragging.enable();
          pinchBaseYRef.current = null;
          pinchCenterLatlngRef.current = null;
          baseZoomRef.current = 0;
        }
        if (zoomTimeoutRef.current) {
          clearTimeout(zoomTimeoutRef.current);
          zoomTimeoutRef.current = null;
        }
      }
    };

    if (!isMobile) {
      map.on('click', handleMapClick);
    }

    if (isMobile) {
      map.on('click', clickHandlerRef.current);
      map.on('contextmenu', handleContextmenu);
      map.on('touchstart mousedown', pressStartRef.current);

      // Attach to DOM container for native events to bypass Leaflet's touch interception
      if (typeof map.getContainer === 'function') {
        const container = map.getContainer();
        container.addEventListener('touchstart', containerTouchHandler, { passive: false });
        container.addEventListener('touchmove', containerTouchHandler, { passive: false });
        container.addEventListener('touchend', containerTouchHandler, { passive: false });
        container._zoomDragHandlers = { containerTouchHandler };
      }
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
        if (typeof map.getContainer === 'function') {
          const container = map.getContainer();
          if (container && container._zoomDragHandlers) {
            container.removeEventListener('touchstart', container._zoomDragHandlers.containerTouchHandler);
            container.removeEventListener('touchmove', container._zoomDragHandlers.containerTouchHandler);
            container.removeEventListener('touchend', container._zoomDragHandlers.containerTouchHandler);
          }
        }
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
