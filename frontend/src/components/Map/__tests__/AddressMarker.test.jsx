import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import AddressMarker from '../AddressMarker';

const mockCircleMarker = {
  addTo: vi.fn(() => mockCircleMarker),
  bringToFront: vi.fn(),
  getElement: vi.fn(() => ({ style: { pointerEvents: 'none' } })),
};
const mockPane = { style: {} };

let getPaneCallCount = 0;

const mockMap = {
  getPane: vi.fn((name) => {
    if (name === 'address-marker-pane') {
      getPaneCallCount++;
      if (getPaneCallCount === 1) return null;
      return mockPane;
    }
    return null;
  }),
  createPane: vi.fn((name) => {
    if (name === 'address-marker-pane') return mockPane;
    return null;
  }),
  removeLayer: vi.fn(),
};

vi.mock('leaflet', () => ({
  default: {
    circleMarker: vi.fn(() => mockCircleMarker),
    DomEvent: { disableClickPropagation: vi.fn() },
  },
}));

vi.mock('react-leaflet', () => ({
  useMap: vi.fn(() => mockMap),
}));

const mockL = await import('leaflet');

describe('AddressMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaneCallCount = 0;
  });

  it('renders nothing when location is null', () => {
    render(<AddressMarker location={null} />);
    expect(mockL.default.circleMarker).not.toHaveBeenCalled();
  });

  it('renders nothing when location is undefined', () => {
    render(<AddressMarker location={undefined} />);
    expect(mockL.default.circleMarker).not.toHaveBeenCalled();
  });

  it('creates a blue circle marker at the given location', () => {
    render(<AddressMarker location={{ lat: 45.55, lng: -73.6 }} />);

    expect(mockL.default.circleMarker).toHaveBeenCalledWith(
      [45.55, -73.6],
      expect.objectContaining({
        radius: 8,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 1,
        weight: 3,
        opacity: 1,
        pane: 'address-marker-pane',
      })
    );
  });

  it('creates address-marker-pane with correct z-index', () => {
    render(<AddressMarker location={{ lat: 45.5, lng: -73.5 }} />);

    expect(mockMap.createPane).toHaveBeenCalledWith('address-marker-pane');
  });

  it('calls addTo on the marker', () => {
    render(<AddressMarker location={{ lat: 45.5, lng: -73.5 }} />);

    expect(mockCircleMarker.addTo).toHaveBeenCalled();
  });

  it('removes marker on unmount', () => {
    getPaneCallCount = 1;
    const { unmount } = render(<AddressMarker location={{ lat: 45.5, lng: -73.5 }} />);

    unmount();
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockCircleMarker);
  });
});
