import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import * as reactLeaflet from 'react-leaflet';

// Mocking fetch and other globals
global.fetch = vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
  })
);

const GEOJSON_URL = 'https://example.com/stations.json';

// Mock Geolocation API
global.navigator.geolocation = {
  getCurrentPosition: vi.fn((success) => success({
    coords: { latitude: 45.5, longitude: -70.5 }
  })),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, style }) => <div data-testid="map-container" style={{height: '100%', width: '100%'}}>{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position, children, eventHandlers }) => (
      <div data-testid="marker" data-position={position.join(',')}>
            {children}
          </div>
        ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ flyTo: vi.fn(), addLayer: vi.fn(), removeLayer: vi.fn(), getContainer: vi.fn() }),
}));

// Mocking MarkerCluster since it's used in App.jsx
vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }) => <div data-testid="marker-cluster">{children}</div>,
}));

// Mocking StationDrawer and FuelFilter to avoid deep rendering issues
vi.mock('./components/Map/StationDrawer', () => ({
  default: ({ stations }) => <div data-testid="station-drawer" data-count={stations.length} />
}));
vi.mock('./components/Map/FuelFilter', () => ({
  default: () => <div data-testid="fuel-filter" />,
}));

// Mocking context
vi.mock('./context/FilterContext', () => ({
  FilterProvider: ({ children }) => <div>{children}</div>,
  useFilters: () => ({ selectedFuelTypes: ['gasoline', 'diesel'] }),
}));

// Mocking useStations hook
vi.mock('./hooks/useStations', () => ({
  useStations: () => ({
    stations: [
      { id: 1, lat: 45.51, lng: -73.57, prices: { regular: 1.50, super: 1.60, diesel: 1.40 }, name: 'Station A' },
       { id: 2, lat: 45.52, lng: -73.58, prices: { regular: 2.50, super: 2.60, diesel: 2.40 }, name: 'Station B' },
      { id: 3, lat: 45.53, lng: -73.59, prices: { regular: 1.99, super: 2.09, diesel: 1.89 }, name: 'Station C' },
    ],
    loading: false,
    error: null,
  }),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should load stations successfully on mount', async () => {
    render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId('station-drawer')).toHaveAttribute('data-count', '3');
      });
  });

  test('should display only stations within the price range filter', async () => {
    render(<App />);
    
    await waitFor(() => {
        expect(screen.getByTestId('station-drawer')).toHaveAttribute('data-count', '3');
    });
    
    const maxInput = screen.getByPlaceholderText(/Max Price/i);
    
    fireEvent.change(maxInput, { target: { value: '2.0' } });
    
    await waitFor(() => {
        expect(screen.getByTestId('station-drawer')).toHaveAttribute('data-count', '2');
    });
  });
});
