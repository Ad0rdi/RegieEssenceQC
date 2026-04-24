import { useMap } from 'react-leaflet';

const ZOOM_DELTA = 1;
const MAX_ZOOM = 19;
const MIN_ZOOM = 1;

export default function ZoomButtons() {
  const map = useMap();

  return (
    <div className="leaflet-custom-zoom">
      <button
        className="leaflet-custom-zoom-btn"
        onClick={() => {
          const currentZoom = map.getZoom();
          if (currentZoom < MAX_ZOOM) map.setZoom(currentZoom + ZOOM_DELTA);
        }}
        title="Zoom avant"
      >
        +
      </button>
      <button
        className="leaflet-custom-zoom-btn"
        onClick={() => {
          const currentZoom = map.getZoom();
          if (currentZoom > MIN_ZOOM) map.setZoom(currentZoom - ZOOM_DELTA);
        }}
        title="Zoom arrière"
      >
        −
      </button>
    </div>
  );
}
