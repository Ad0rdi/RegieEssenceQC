import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ManualLocationMarker from '../ManualLocationMarker';

const mockMap = {
  getPane: vi.fn(),
  createPane: vi.fn(),
  removeLayer: vi.fn(),
  addLayer: vi.fn(),
  latLngToLayerPoint: vi.fn(),
};

vi.mock('react-leaflet', () => ({
  useMap: vi.fn(() => mockMap),
}));

const { mockL } = vi.hoisted(() => {
  const markerSpy = vi.fn();
  const divIconSpy = vi.fn();
  return {
    mockL: {
      marker: markerSpy.mockImplementation(() => ({
        bringToFront: vi.fn(),
      })),
      divIcon: divIconSpy.mockReturnValue({}),
    },
  };
});

vi.mock('leaflet', () => ({
  default: mockL,
}));

describe('ManualLocationMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getPane.mockReturnValue(null);
    mockMap.createPane.mockReturnValue({ style: {} });
    mockMap.addLayer.mockImplementation(() => {});
  });

  it('renders nothing when location is null', () => {
    const { container } = render(<ManualLocationMarker location={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when location is undefined', () => {
    const { container } = render(<ManualLocationMarker location={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('creates a marker at the given location', () => {
    render(<ManualLocationMarker location={{ lat: 45.5, lng: -73.6 }} />);

    expect(mockL.marker).toHaveBeenCalledWith(
      [45.5, -73.6],
      expect.objectContaining({
        pane: 'manual-marker-pane',
      })
    );
  });

  it('creates manual-marker-pane if it does not exist', () => {
    mockMap.getPane.mockReturnValue(null);

    render(<ManualLocationMarker location={{ lat: 45.5, lng: -73.6 }} />);

    expect(mockMap.createPane).toHaveBeenCalledWith('manual-marker-pane');
  });

  it('sets z-index on marker pane', () => {
    const paneMock = { style: {} };
    mockMap.createPane.mockReturnValue(paneMock);

    render(<ManualLocationMarker location={{ lat: 45.5, lng: -73.6 }} />);

    expect(paneMock.style.zIndex).toBe(650);
  });

  it('calls addLayer on the map', () => {
    render(<ManualLocationMarker location={{ lat: 45.5, lng: -73.6 }} />);

    expect(mockMap.addLayer).toHaveBeenCalled();
  });

  it('removes marker on unmount', () => {
    const removeLayerMock = vi.fn();
    mockMap.removeLayer = removeLayerMock;

    const { unmount } = render(<ManualLocationMarker location={{ lat: 45.5, lng: -73.6 }} />);

    unmount();

    expect(removeLayerMock).toHaveBeenCalled();
  });
});
