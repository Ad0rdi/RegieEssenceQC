import { ZoomControl } from 'react-leaflet';

function ZoomPositioner() {
  return (
    <div className="leaflet-desktop-only">
      <ZoomControl position='bottomright' />
    </div>
  );
}

export default ZoomPositioner;
