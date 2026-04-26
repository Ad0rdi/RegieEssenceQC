import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

const DOT_RADIUS = 6;
const GPS_PANE_Z_INDEX = 800;

function UserLocationMarker({ location }) {
  const map = useMap();
  const dotRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    let gpsPane = map.getPane('gps-marker-pane');
    if (!gpsPane) {
      gpsPane = map.createPane('gps-marker-pane');
    }
    gpsPane.style.zIndex = GPS_PANE_Z_INDEX;
  }, [map]);

  useEffect(() => {
    if (!location) return;

    const gpsPane = map.getPane('gps-marker-pane');

    if (dotRef.current) {
      map.removeLayer(dotRef.current);
    }
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
    }

    const accuracy = location.accuracy ?? 50;

    const centerLatLng = L.latLng(location.lat, location.lng);
    const centerPixel = map.latLngToLayerPoint(centerLatLng);

    const northLatLng = L.latLng(location.lat + accuracy / 111320, location.lng);
    const northPixel = map.latLngToLayerPoint(northLatLng);

    const ringPixelRadius = Math.abs(northPixel.y - centerPixel.y);

    circleRef.current = L.circle([location.lat, location.lng], {
      radius: accuracy,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: ringPixelRadius < 10 ? 0.08 : 0.15,
      weight: 1,
      opacity: ringPixelRadius < 10 ? 0.2 : 0.3,
      pane: 'gps-marker-pane',
    }).addTo(map);

    dotRef.current = L.circleMarker([location.lat, location.lng], {
      radius: DOT_RADIUS,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
      weight: 2,
      opacity: 1,
      pane: 'gps-marker-pane',
    }).addTo(map);

    dotRef.current.bringToFront();
    dotRef.current.getElement().style.pointerEvents = 'none';

    L.DomEvent.disableClickPropagation(circleRef.current);
  }, [location, map]);

  useEffect(() => {
    return () => {
      if (dotRef.current) map.removeLayer(dotRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
    };
  }, [map]);

  return null;
}

export default UserLocationMarker;
