import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

function ZoomPositioner() {
  const map = useMap();

  useEffect(() => {
    const zoomControl = map.zoomControl;
    if (zoomControl) {
      map.removeControl(zoomControl);
      map.addControl(zoomControl, 'bottomright');
    }
  }, [map]);

  return null;
}

export default ZoomPositioner;
