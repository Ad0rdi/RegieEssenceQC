import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerCluster from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import FuelFilter from './components/Map/FuelFilter';
import StationDrawer from './components/Map/StationDrawer';
import { useStations } from './hooks/useStations';
import { useFilters } from './context/FilterContext';

// --- Constants ---
const DEFAULT_CENTER = [45.5017, -73.5673]; // Example center coordinates
const DEFAULT_ZOOM = 13;

// --- Utility Function ---
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  // Haversine formula to calculate distance in meters
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

function AppContent() {
  const { selectedFuelTypes } = useFilters();
  const { stations, loading, error } = useStations(selectedFuelTypes);
  const [userLocation, setUserLocation] = useState(null);
  const [priceFilter, setPriceFilter] = useState({ min: null, max: null });
  const [radiusFilter, setRadiusFilter] = useState(null);

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
      const price = station.prices?.regular;
      if (priceFilter.min !== null || priceFilter.max !== null) {
        if (price === undefined || price === null || 
            price < (priceFilter.min || 0) || price > (priceFilter.max || Infinity)) {
          passesPrice = false;
        }
      }
      
      // 2. Radius Filter Check
      let passesRadius = true;
      if (userLocation && radiusFilter !== null) {
        const distanceMeters = calculateDistance(
          userLocation.lat, userLocation.lng,
          station.lat, station.lng
        );
        
        if (distanceMeters > radiusFilter) {
          passesRadius = false;
        }
      }
      
      return passesPrice && passesRadius;
    });
  }, [stations, priceFilter, radiusFilter, userLocation]);


  // --- Map Marker Component ---
  const StationMarker = ({ station }) => {
    // Defensive check for position
    if (!station || typeof station.lat !== 'number' || typeof station.lng !== 'number') {
      return null;
    }

    return (
      <Marker position={[station.lat, station.lng]}>
        <Popup>
          <strong style={{ display: 'block', marginBottom: '4px' }}>{station.brand || station.name}</strong>
          <div style={{ marginBottom: '4px' }}>{station.company}</div>
          <div style={{ marginBottom: '8px' }}>{station.address}</div>
          <div>Regular: ${station.prices?.regular?.toFixed(2) || 'N/A'} / L</div>
          <div>Super: ${station.prices?.super?.toFixed(2) || 'N/A'} / L</div>
          <div>Diesel: ${station.prices?.diesel?.toFixed(2) || 'N/A'} / L</div>
        </Popup>
      </Marker>
    );
  };

  // Determine map center based on user location or default
  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : DEFAULT_CENTER;

  if (error) return <div className="error">{error}</div>;
  if (loading) return <div className="loading">Loading gas station data...</div>;

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">Gas Station Price Map</h1>
        <div className="controls">
          <button onClick={getLocation} className="location-btn">Use My Location</button>

          <div className="filter-group">
            <label htmlFor="min-price">Min Price ($):</label>
            <input
              id="min-price"
              type="number"
              step="0.01"
              value={priceFilter.min === null ? '' : priceFilter.min}
              onChange={(e) => setPriceFilter(p => ({ ...p, min: e.target.value ? parseFloat(e.target.value) : null }))}
              placeholder="Min Price"
            />
          </div>
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
              value={radiusFilter ? (radiusFilter / 1000).toFixed(1) : ''}
              onChange={(e) => setRadiusFilter(e.target.value ? parseFloat(e.target.value) * 1000 : null)}
              placeholder="Radius km"
            />
          </div>
          <button onClick={() => setPriceFilter({ min: null, max: null })} className="reset-btn">Reset Filters</button>
        </div>
      </header>

        <div className="map-container">
          <FuelFilter />
          <StationDrawer stations={filteredFeatures} />
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
              {filteredFeatures.map((station, index) => (
                <StationMarker key={station.id || index} station={station} />
              ))}
            </MarkerCluster>
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
