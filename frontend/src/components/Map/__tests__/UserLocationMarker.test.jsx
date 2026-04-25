import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import UserLocationMarker from '../UserLocationMarker';

const mockCircle = { addTo: vi.fn(() => mockCircle), remove: vi.fn() };
const mockCircleMarker = { addTo: vi.fn(() => mockCircleMarker), remove: vi.fn() };

const mockMap = {
  hasLayer: vi.fn(() => false),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  whenCreated: vi.fn(),
};

vi.mock('leaflet', () => ({
  default: {
    circle: vi.fn(() => mockCircle),
    circleMarker: vi.fn(() => mockCircleMarker),
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
    });

    expect(mockL.default.circleMarker).toHaveBeenCalledWith([45.5, -73.5], {
      radius: 6,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
      weight: 2,
      opacity: 1,
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

  it('removes old layers when location changes', () => {
    const { rerender } = render(<UserLocationMarker location={createLocation()} />);

    vi.clearAllMocks();
    mockCircle.addTo.mockReturnValue(mockCircle);
    mockCircleMarker.addTo.mockReturnValue(mockCircleMarker);

    rerender(<UserLocationMarker location={createLocation({ lat: 46.0, lng: -74.0, accuracy: 75 })} />);

    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockCircle);
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockCircleMarker);
    expect(mockL.default.circle).toHaveBeenCalledWith([46.0, -74.0], expect.any(Object));
    expect(mockL.default.circleMarker).toHaveBeenCalledWith([46.0, -74.0], expect.any(Object));
  });
});
