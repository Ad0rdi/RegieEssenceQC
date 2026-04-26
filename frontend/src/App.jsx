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
const GPS_ZOOM = 17;
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
    const [gpsMarkerPosition, setGpsMarkerPosition] = useState(null);
    useEffect(() => {
      window.__GPS_STATE = { markerPosition: gpsMarkerPosition, centerLocation };
    }, [gpsMarkerPosition, centerLocation]);
  
  const setGpsLocation = useCallback((position) => {
    if (position) {
      setCenterLocation(position);
    }
  }, []);

useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handler);
    return () => {
      document.removeEventListener('contextmenu', handler);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
        let watchId = null;
        let lastWatchedLat = null;
        let lastWatchedLng = null;

        const initGPS = () => {
     navigator.geolocation.getCurrentPosition(
            (position) => {
               if (position.coords.accuracy > 1 && position.coords.accuracy <= 100) {
                 setGpsMarkerPosition({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
               }
             },
             (err) => { /* initial GPS error */ },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
            );

           watchId = navigator.geolocation.watchPosition(
                (position) => {
                  if (
                    Math.abs(position.coords.latitude - lastWatchedLat) < 0.00001 &&
                    Math.abs(position.coords.longitude - lastWatchedLng) < 0.00001
                  ) {
                    return;
                  }
                  lastWatchedLat = position.coords.latitude;
                  lastWatchedLng = position.coords.longitude;

                  if (position.coords.accuracy > 1 && position.coords.accuracy <= 100) {
                    setGpsMarkerPosition({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      accuracy: position.coords.accuracy,
                    });
                  }
                },
                (err) => { /* watch GPS error */ },
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
              );
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
  const mapZoom = centerLocation ? GPS_ZOOM : DEFAULT_ZOOM;

 return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-content">
          <div className="legend-frame">
            <PriceLegend stations={filteredFeatures} selectedFuelTypes={selectedFuelTypes} />
          </div>
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

              <form onSubmit={(e) => e.preventDefault()}>
                <div className="header-filters">

                  <div className="filter-input-group">
                    <label htmlFor="radius">Rayon km</label>
                    <input
                      id="radius"
                      className="filter-input-select"
                      type="text"
                      inputMode="numeric"
                      enterKeyHint="done"
                      step="1"
                      value={radiusFilter !== null ? radiusFilter : ''}
                      onChange={(e) => setRadiusFilter(e.target.value ? parseFloat(e.target.value) : null)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                      onFocus={(e) => { e.target.style.userSelect = 'text'; e.target.style.webkitUserSelect = 'text'; e.target.select(); }}
                      onBlur={(e) => { e.target.style.userSelect = ''; e.target.style.webkitUserSelect = ''; }}
                      placeholder="—"
                    />
                  </div>
                    <div className="filter-input-group">
                        <label htmlFor="max-price">Prix max $</label>
                        <input
                            id="max-price"
                            className="filter-input-select"
                            type="number"
                            step="0.01"
                            enterKeyHint="done"
                            value={priceFilter.max === null ? '' : priceFilter.max}
                            onChange={(e) => setPriceFilter(p => ({ ...p, max: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                            onFocus={(e) => { e.target.style.userSelect = 'text'; e.target.style.webkitUserSelect = 'text'; e.target.select(); }}
                            onBlur={(e) => { e.target.style.userSelect = ''; e.target.style.webkitUserSelect = ''; }}
                            placeholder="—"
                        />
                    </div>
                </div>
              </form>

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
        </div>
      </div>

      <div className="map-container">
        <StationDrawer stations={filteredFeatures} onStationClick={handleDrawerStationClick} selectedStationId={selectedStationId} centerLocation={centerLocation} />
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          wheelPxPerZoomLevel={WHEEL_PX_PER_ZOOM_LEVEL}
          zoomSnap={ZOOM_SNAP}
          zoomDelta={ZOOM_DELTA}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <div className="leaflet-bottom-controls">
            {!isMobile && <ZoomButtons />}
            <GpsButton onGpsClick={(pos) => setGpsLocation(pos)} />
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
          <UserLocationMarker location={gpsMarkerPosition} />
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
