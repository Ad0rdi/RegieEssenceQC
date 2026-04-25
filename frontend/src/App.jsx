import L from 'leaflet';
import { FilterProvider, useFilters } from './context/FilterContext';
import { useTheme } from './context/ThemeContext';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useStations } from './hooks/useStations';
import { useIsMobile } from './hooks/useIsMobile';
import StationDrawer from './components/Map/StationDrawer';
import FuelFilter from './components/Map/FuelFilter';
import { MapContainer, TileLayer } from 'react-leaflet';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import MapController from './components/Map/MapController';
import MapMarkers from './components/Map/MapMarkers';
import UserLocationMarker from './components/Map/UserLocationMarker';
import PriceLegend from './components/Map/PriceLegend';
import CitySearchInput from './components/Map/CitySearchInput';
import CityZoomController from './components/Map/CityZoomController';
import GpsButton from './components/Map/GpsButton';
import ZoomButtons from './components/Map/ZoomButtons';
import StationDrawerButton from './components/Map/StationDrawerButton';
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

function AppContent() {
  const isMobile = useIsMobile();
  const { selectedFuelTypes, drawerOpen, setDrawerOpen } = useFilters();
   const { theme, toggleTheme } = useTheme();
  const pricingFuelType = selectedFuelTypes.length > 0 ? selectedFuelTypes[0] : 'regular';
  const { stations, loading, error } = useStations(selectedFuelTypes);
  const [centerLocation, setCenterLocation] = useState(null);
   const [priceFilter, setPriceFilter] = useState({ min: null, max: null });
   const [radiusFilter, setRadiusFilter] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
   const [selectedStationSource, setSelectedStationSource] = useState(null);
   const [gpsWatchId, setGpsWatchId] = useState(null);

   const setGpsLocation = useCallback(() => {
     if (!navigator.geolocation) {
       alert("La géolocalisation n'est pas supportée par ce navigateur.");
       return;
     }
     navigator.geolocation.getCurrentPosition(
       (position) => {
         if (position.coords.accuracy <= 100) {
           setCenterLocation({
             lat: position.coords.latitude,
             lng: position.coords.longitude,
             accuracy: position.coords.accuracy,
           });
         }
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

    // Initialize GPS on mount: request position + start watching
    useEffect(() => {
      if (!navigator.geolocation) return;

      const initGPS = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position.coords.accuracy <= 100) {
              setCenterLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            }
          },
          () => { /* denied/timeout: keep last known, ignore silently */ },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (position.coords.accuracy <= 100) {
              setCenterLocation((prev) =>
                prev ? { ...prev, lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy } : null
              );
            }
          },
          () => { /* ignore: keep last known location */ },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        setGpsWatchId(watchId);
      };

      initGPS();

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
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
        const stationFuelKeys = Object.keys(station.prices || {});
        const hasSelectedFuel = selectedFuelTypes.some(type =>
          stationFuelKeys.includes(type)
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
    setSelectedStationSource('map');
  };

  const handleDrawerStationClick = (station) => {
    setSelectedStationId(station.id);
    setSelectedStationSource('drawer');
  };

  const selectedStation = useMemo(() => 
    filteredFeatures.find(s => s.id === selectedStationId),
    [filteredFeatures, selectedStationId]
  );

  const mapCenter = centerLocation ? [centerLocation.lat, centerLocation.lng] : DEFAULT_CENTER;

 return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-content">
          <div className="header-controls">
            <div className="controls-frame">
              <div className="header-logo">
                <div className="header-logo-icon">⛽</div>
                <span className="header-logo-text">Station Finder</span>
              </div>

              <div className="header-divider" />

              <div className="header-location">
                <CitySearchInput onCitySelect={handleCitySelect} />
              </div>

              <div className="header-divider" />

              <FuelFilter />

              <div className="header-divider" />

              <div className="header-filters">
                <div className="filter-input-group">
                  <label htmlFor="max-price">Prix max $</label>
                  <input
                    id="max-price"
                    type="number"
                    step="0.01"
                    value={priceFilter.max === null ? '' : priceFilter.max}
                    onChange={(e) => setPriceFilter(p => ({ ...p, max: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="—"
                  />
                </div>
                <div className="filter-input-group">
                  <label htmlFor="radius">Rayon km</label>
                  <input
                    id="radius"
                    type="number"
                    step="1"
                    value={radiusFilter !== null ? radiusFilter : ''}
                    onChange={(e) => setRadiusFilter(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="—"
                  />
                </div>
              </div>

              <div className="header-divider" />

              <button onClick={() => { setPriceFilter({ min: null, max: null }); setRadiusFilter(null); }} className="reset-btn">
                Réinitialiser
              </button>

              <div className="header-divider" />

              <button onClick={toggleTheme} className="theme-toggle-btn" title="Changer le thème">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
          <div className="legend-frame">
            <PriceLegend stations={filteredFeatures} selectedFuelTypes={selectedFuelTypes} />
          </div>
        </div>
      </div>

      <div className="map-container">
        <StationDrawer stations={filteredFeatures} onStationClick={handleDrawerStationClick} selectedStationId={selectedStationId} />
        <MapContainer
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM_LEVEL}
          zoomSnap={ZOOM_SNAP}
          zoomDelta={ZOOM_DELTA}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <div className="leaflet-bottom-controls">
            {!isMobile && <ZoomButtons />}
            <GpsButton onGpsClick={() => setGpsLocation()} />
          </div>
          <StationDrawerButton
            stationCount={filteredFeatures.length}
            drawerOpen={drawerOpen}
            onToggle={() => setDrawerOpen(!drawerOpen)}
          />
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {centerLocation && <UserLocationMarker location={centerLocation} />}
          <MapMarkers
            stations={filteredFeatures}
            selectedStationId={selectedStationId}
            onStationClick={handleStationClick}
            selectedFuelTypes={selectedFuelTypes}
            selectedFuelType={pricingFuelType}
          />
          {selectedStation && <MapController station={selectedStation} source={selectedStationSource} />}
          {centerLocation && <CityZoomController city={centerLocation} />}
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
