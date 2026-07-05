import { ZoomControl } from 'react-leaflet';

function ZoomPositioner() {
  return (
    <div className="leaflet-desktop-only">
      <ZoomControl position='bottomright' />
    </div>
  );
}

// Note: This component is not currently used in the app (hidden behind JS zoom control logic)
