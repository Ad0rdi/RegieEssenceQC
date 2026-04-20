import L from 'leaflet';
import { FilterProvider, useFilters } from './context/FilterContext';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useStations } from './hooks/useStations';
import StationDrawer from './components/Map/StationDrawer';
import FuelFilter from './components/Map/FuelFilter';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerCluster from 'react-leaflet-cluster';
import React, { useState, useMemo, useEffect } from 'react';
import { calculateDistance } from './utils/geolocation';
import './App.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const DEFAULT_CENTER = [45.5017, -73.5673];
const DEFAULT_ZOOM = 12;

const selectedIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [25, 41],
});

function AppContent()
 {
  const { selectedFuelTypes } = useFilters();
  const { stations, loading, error } = useStations(selectedFuelTypes);
  const [userLocation, setUserLocation] = useState(null);
  const [priceFilter, setPriceFilter] = useState({ min: null, max: null });
  const [radiusFilter, setRadiusFilter] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    }, (err) => {
      alert(`Geolocation error: ${err.message}`);
    });
  };

  // --- Filtering Logic ---
  const filteredFeatures = useMemo(() => {
    if (!stations || stations.length === 0) return [];
    
    return stations.filter(station => {
      let passesPrice = true;
      
        // 1. Price Filter Check
        const prices = Object.values(station.prices || {});
        if (priceFilter.min !== null || priceFilter.max !== null) {
          const hasValidPriceInRange = prices.some(price => {
            const min = priceFilter.min || 0;
            const max = priceFilter.max || Infinity;
            return price >= min && price <= max;
          });
          if (!hasValidPriceInRange) {
            passesPrice = false;
          }
        }
        
        // 2. Radius Filter Check
        let passesRadius = true;
        if (userLocation && radiusFilter !== null) {
          const distanceKm = calculateDistance(
            userLocation.lat, userLocation.lng,
            station.lat, station.lng
          );
          
          if (distanceKm > radiusFilter) {
            passesRadius = false;
          }
        }
        
        return passesPrice && passesRadius;
      });
    }, [stations, priceFilter, radiusFilter, userLocation]);

  const handleStationClick = (station) => {
    setSelectedStationId(station.id);
  };

  const selectedStation = useMemo(() => 
    filteredFeatures.find(s => s.id === selectedStationId),
    [filteredFeatures, selectedStationId]
  );

  // --- Map Marker Component ---
    const StationMarker = ({ station, onClick }) => {
      if (!station || typeof station.lat !== 'number' || typeof station.lng !== 'number') {
        return null;
      }

      const isSelected = selectedStationId === station.id;

      return (
        <Marker position={[station.lat, station.lng]} eventHandlers={{
          click: () => onClick && onClick(station)
        }}
        icon={isSelected ? selectedIcon : undefined}
      >
          <Popup
            style={{
              backgroundColor: isSelected ? '#fff3cd' : '',
              border: isSelected ? '2px solid #ffc107' : ''
            }}
          >
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

  // --- Map Controller Component ---
  const MapController = ({ station }) => {
    const map = useMap();
    useEffect(() => {
      if (station) {
        map.flyTo([station.lat, station.lng], 15);
      }
    }, [station, map]);
    return null;
  };

  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : DEFAULT_CENTER;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Station Finder</h1>
        <div className="filter-controls">
          <button onClick={getLocation}>Use My Location</button>
          <FuelFilter />
          <div className="filter-group">
            <label htmlFor="max-price">Max Price ($):</label>
            <input
              id="max-price"
              type="number"
              step="0.01"
              value={priceFilter.max === null ? '' : priceFilter.max}
              onChange={(e) => setPriceFilter(p => ({ ...p, max: e.target.value ? parseFloat(e.target.value) : null }))}
              placeholder="Max Price"
            />
          </div>
          <div className="filter-group">
           <label htmlFor="radius">Radius (km):</label>
             <input
               id="radius"
               type="number"
               step="0.1"
               value={radiusFilter !== null ? radiusFilter.toFixed(1) : ''}
               onChange={(e) => setRadiusFilter(e.target.value ? parseFloat(e.target.value) : null)}
               placeholder="Radius km"
             />
          </div>
          <button onClick={() => { setPriceFilter({ min: null, max: null }); setRadiusFilter(null); }} className="reset-btn">Reset Filters</button>
        </div>
       </header>
      <div className="map-container">
        <StationDrawer stations={filteredFeatures} onStationClick={handleStationClick} />
        <MapContainer
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          style={{ height: 'calc(100vh - 150px)', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerCluster>
            {filteredFeatures.map((station) => (
              <StationMarker key={station.id} station={station} onClick={handleStationClick} />
            ))}
          </MarkerCluster>
          {selectedStation && <MapController station={selectedStation} />}
        </MapContainer>
      </div>
    </div>
  );
}

function App() {
  return (
    <FilterProvider>
      <AppContent />
    </FilterProvider>
  );
}

export default App;
