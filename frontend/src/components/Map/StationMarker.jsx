import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const selectedIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [25, 41],
});

const StationMarker = ({ station, isSelected, onClick }) => {
  if (!station || typeof station.lat !== 'number' || typeof station.lng !== 'number') {
    return null;
  }

  return (
    <Marker
      position={[station.lat, station.lng]}
      icon={isSelected ? selectedIcon : undefined}
      eventHandlers={{
        click: () => onClick && onClick(station),
      }}
    >
      <Popup>
        <strong style={{ display: 'block', marginBottom: '4px' }}>{station.brand || station.name || 'N/A'}</strong>
        <div style={{ marginBottom: '4px' }}>{station.company || 'N/A'}</div>
        <div style={{ marginBottom: '8px' }}>{station.address || 'N/A'}</div>
        <div style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>Regular: ${station.prices?.regular?.toFixed(2) || 'N/A'} / L</div>
        <div style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>Super: ${station.prices?.super?.toFixed(2) || 'N/A'} / L</div>
        <div style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>Diesel: ${station.prices?.diesel?.toFixed(2) || 'N/A'} / L</div>
      </Popup>
    </Marker>
  );
};

export default StationMarker;
