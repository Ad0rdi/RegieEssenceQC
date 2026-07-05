import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import UserLocationMarker from '../UserLocationMarker';

const mockCircle = { addTo: vi.fn(() => mockCircle), remove: vi.fn(), setLatLng: vi.fn(), setStyle: vi.fn() };
const mockCircleMarker = { addTo: vi.fn(() => mockCircleMarker), remove: vi.fn(), bringToFront: vi.fn(), getElement: vi.fn(() => mockDotElement), setLatLng: vi.fn() };
const mockDotElement = { style: {} };
const mockPane = { style: {} };
const mockLatLng = { lat: 0, lng: 0 };
const mockCenterPoint = { x: 100, y: 100 };
const mockNorthPoint = { x: 100, y: 250 };

let latLngCallCount = 0;
let paneCreated = false;

const mockMap = {
  hasLayer: vi.fn(() => false),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  whenCreated: vi.fn(),
  latLngToLayerPoint: vi.fn(() => {
    latLngCallCount++;
    return latLngCallCount % 2 === 1 ? mockCenterPoint : mockNorthPoint;
  }),
  containerPointToLatLng: vi.fn(() => mockLatLng),
  getPane: vi.fn((name) => {
    if (name === 'gps-marker-pane' && paneCreated) return mockPane;
    return null;
  }),
  createPane: vi.fn((name) => {
    if (name === 'gps-marker-pane') {
      paneCreated = true;
      return mockPane;
    }
    return null;
  }),
};

vi.mock('leaflet', () => ({
  default: {
    circle: vi.fn(() => mockCircle),
    circleMarker: vi.fn(() => mockCircleMarker),
    latLng: vi.fn((lat, lng) => ({ lat, lng })),
    point: vi.fn((x, y) => ({ x, y, add: (dx, dy) => ({ x: x + dx, y: y + dy }) })),
    DomEvent: { disableClickPropagation: vi.fn() },
  },
}));

vi.mock('react-leaflet', () => ({
  useMap: vi.fn(() => mockMap),
}));

const mockL = await import('leaflet');

function createLocation(overrides = {}) {
  return { lat: 45.5, lng: -73.5, accuracy: 50, ...overrides };
}

describe('UserLocationMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latLngCallCount = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when location is null', () => {
    render(<UserLocationMarker location={null} />);
    expect(mockL.default.circle).not.toHaveBeenCalled();
    expect(mockL.default.circleMarker).not.toHaveBeenCalled();
  });

  it('renders nothing when location is undefined', () => {
    render(<UserLocationMarker location={undefined} />);
    expect(mockL.default.circle).not.toHaveBeenCalled();
    expect(mockL.default.circleMarker).not.toHaveBeenCalled();
  });

  it('creates circle and circleMarker when location is provided', () => {
    render(<UserLocationMarker location={createLocation()} />);

    expect(mockL.default.circle).toHaveBeenCalledWith([45.5, -73.5], {
      radius: 50,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 1,
      opacity: 0.3,
      pane: 'gps-marker-pane',
    });

    expect(mockL.default.circleMarker).toHaveBeenCalledWith([45.5, -73.5], {
      radius: 6,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
      weight: 2,
      opacity: 1,
      pane: 'gps-marker-pane',
    });
  });

  it('uses the accuracy value as circle radius', () => {
    render(<UserLocationMarker location={createLocation({ accuracy: 100 })} />);

    expect(mockL.default.circle).toHaveBeenCalledWith([45.5, -73.5], expect.objectContaining({
      radius: 100,
    }));
  });

  it('calls addTo on both layers', () => {
    render(<UserLocationMarker location={createLocation()} />);

    expect(mockCircle.addTo).toHaveBeenCalled();
    expect(mockCircleMarker.addTo).toHaveBeenCalled();
  });

  it('updates existing layers when location changes', () => {
    const { rerender } = render(<UserLocationMarker location={createLocation()} />);

    vi.clearAllMocks();

    rerender(<UserLocationMarker location={createLocation({ lat: 46.0, lng: -74.0, accuracy: 75 })} />);

    expect(mockL.default.circle).not.toHaveBeenCalled();
    expect(mockL.default.circleMarker).not.toHaveBeenCalled();
    expect(mockCircle.setLatLng).toHaveBeenCalledWith(expect.objectContaining({ lat: 46.0, lng: -74.0 }));
    expect(mockCircle.setStyle).toHaveBeenCalled();
    expect(mockCircleMarker.setLatLng).toHaveBeenCalledWith(expect.objectContaining({ lat: 46.0, lng: -74.0 }));
    expect(mockCircleMarker.bringToFront).toHaveBeenCalled();
  });

  it('removes old layers on unmount', () => {
    const { unmount } = render(<UserLocationMarker location={createLocation()} />);

    unmount();

    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockCircle);
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockCircleMarker);
  });
});
