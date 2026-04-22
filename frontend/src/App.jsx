import L from 'leaflet';
import { FilterProvider, useFilters } from './context/FilterContext';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useStations } from './hooks/useStations';
import StationDrawer from './components/Map/StationDrawer';
import FuelFilter from './components/Map/FuelFilter';
import { MapContainer, TileLayer } from 'react-leaflet';
import React, { useState, useMemo, useCallback } from 'react';
import MapController from './components/Map/MapController';
import MapMarkers from './components/Map/MapMarkers';
import PriceLegend from './components/Map/PriceLegend';
import CitySearchInput from './components/Map/CitySearchInput';
import CityZoomController from './components/Map/CityZoomController';
import { calculateDistance } from './utils/geolocation';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const DEFAULT_CENTER = [45.5017, -73.5673];
const DEFAULT_ZOOM = 12;
const WHEEL_PX_PER_ZOOM_LEVEL = 150;
const ZOOM_SNAP = 0.25;
const ZOOM_DELTA = 0.25;

function AppContent()
 {
  const { selectedFuelTypes } = useFilters();
  const pricingFuelType = selectedFuelTypes.length > 0 ? selectedFuelTypes[0] : 'regular';
  const { stations, loading, error } = useStations(selectedFuelTypes);
  const [centerLocation, setCenterLocation] = useState(null);
   const [priceFilter, setPriceFilter] = useState({ min: null, max: null });
   const [radiusFilter, setRadiusFilter] = useState(null);
   const [selectedStationId, setSelectedStationId] = useState(null);

   const setGpsLocation = useCallback(() => {
     if (!navigator.geolocation) {
       alert("La géolocalisation n'est pas supportée par ce navigateur.");
       return;
     }
     navigator.geolocation.getCurrentPosition(
       (position) => {
         setCenterLocation({
           lat: position.coords.latitude,
           lng: position.coords.longitude,
           source: 'gps'
         });
       },
       (err) => {
         const messages = {
           1: "Accès à la position refusé. Veuillez autoriser la géolocalisation.",
           2: "Position indisponible. Vérifiez les paramètres de votre appareil.",
           3: "Délai d'attente dépassé. Réessayez s'il vous plaît.",
         };
         alert(messages[err.code] || `Erreur de géolocalisation: ${err.message}`);
       },
       { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
     );
   }, []);

   const handleCitySelect = useCallback((location) => {
     setCenterLocation(location);
   }, []);

  // --- Filtering Logic ---
  const filteredFeatures = useMemo(() => {
    if (!stations || stations.length === 0) return [];
    
    return stations.filter(station => {
      // 0. Fuel Type Availability Check - hide stations without any selected fuel
      if (selectedFuelTypes.length > 0) {
        const hasSelectedFuel = selectedFuelTypes.some(type =>
          station.prices?.[type] != null
        );
        if (!hasSelectedFuel) return false;
      }

      let passesPrice = true;

      // 1. Price Filter Check - only for selected fuel types
      if (priceFilter.min !== null || priceFilter.max !== null) {
        const relevantPrices = Object.entries(station.prices || {})
          .filter(([type]) => {
            if (selectedFuelTypes.length === 0) return true;
            return selectedFuelTypes.some(selectedType =>
              type.toLowerCase().includes(selectedType)
            );
          })
          .map(([type, price]) => price);

        if (relevantPrices.length > 0) {
          const min = priceFilter.min || 0;
          const max = priceFilter.max || Infinity;
          const hasValidPriceInRange = relevantPrices.some(price =>
            price >= min && price <= max
          );
          if (!hasValidPriceInRange) {
            passesPrice = false;
          }
        }
      }
        
        // 2. Radius Filter Check
        let passesRadius = true;
        if (centerLocation && radiusFilter !== null) {
          const distanceKm = calculateDistance(
            centerLocation.lat, centerLocation.lng,
            station.lat, station.lng
          );
          
          if (distanceKm > radiusFilter) {
            passesRadius = false;
          }
        }
        
        return passesPrice && passesRadius;
      });
    },
    [stations, priceFilter, radiusFilter, centerLocation, selectedFuelTypes]);

  const handleStationClick = (station) => {
    setSelectedStationId(station.id);
  };

  const selectedStation = useMemo(() => 
    filteredFeatures.find(s => s.id === selectedStationId),
    [filteredFeatures, selectedStationId]
  );

  const mapCenter = centerLocation ? [centerLocation.lat, centerLocation.lng] : DEFAULT_CENTER;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Station Finder</h1>
        <div className="filter-controls">
          <button onClick={setGpsLocation} className="gps-btn">Use My Location</button>
          <CitySearchInput onCitySelect={handleCitySelect} />
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
                step="1"
                value={radiusFilter !== null ? radiusFilter : ''}
                onChange={(e) => setRadiusFilter(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Radius km"
              />
           </div>
          <button onClick={() => { setPriceFilter({ min: null, max: null }); setRadiusFilter(null); }} className="reset-btn">Reset Filters</button>
        </div>
       </header>
      <div className="map-container">
        <StationDrawer stations={filteredFeatures} onStationClick={handleStationClick} selectedStationId={selectedStationId} />
        <MapContainer
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM_LEVEL}
          zoomSnap={ZOOM_SNAP}
          zoomDelta={ZOOM_DELTA}
          style={{ height: 'calc(100vh - 150px)', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PriceLegend />
          <MapMarkers
            stations={filteredFeatures}
            selectedStationId={selectedStationId}
            onStationClick={handleStationClick}
            selectedFuelTypes={selectedFuelTypes}
            selectedFuelType={pricingFuelType}
          />
          {selectedStation && <MapController station={selectedStation} />}
          {centerLocation?.source === 'city' && <CityZoomController city={centerLocation} />}
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
