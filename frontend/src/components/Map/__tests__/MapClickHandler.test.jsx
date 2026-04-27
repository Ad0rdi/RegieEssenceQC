import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import MapClickHandler from '../MapClickHandler';

const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
  getPane: vi.fn(),
  createPane: vi.fn(),
  removeLayer: vi.fn(),
};

const { useIsMobileMock } = vi.hoisted(() => {
  const mock = vi.fn();
  mock.mockReturnValue(false);
  return { useIsMobileMock: mock };
});

vi.mock('react-leaflet', () => ({
  useMap: vi.fn(() => mockMap),
}));

vi.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: useIsMobileMock,
}));

describe('MapClickHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('desktop: click on map sets location via callback', () => {
    const mockCallback = vi.fn();
    const handlers = {};
    mockMap.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });

    render(<MapClickHandler onMapClick={mockCallback} />);

    handlers.click({
      latlng: { lat: 45.5, lng: -73.6 },
      originalEvent: { target: {} },
    });

    expect(mockCallback).toHaveBeenCalledWith({
      lat: 45.5,
      lng: -73.6,
      source: 'map',
    });
  });

  it('desktop: click on marker does NOT set location', () => {
    const mockCallback = vi.fn();
    const handlers = {};
    mockMap.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });

    render(<MapClickHandler onMapClick={mockCallback} />);

    const markerTarget = {
      classList: { contains: (cls) => cls === 'leaflet-marker-icon' },
    };

    handlers.click({
      latlng: { lat: 45.5, lng: -73.6 },
      originalEvent: { target: markerTarget },
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('mobile: contextmenu on map sets location via callback', () => {
    const mockCallback = vi.fn();
    const preventDefault = vi.fn();
    const handlers = {};
    useIsMobileMock.mockReturnValue(true);
    mockMap.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });

    render(<MapClickHandler onMapClick={mockCallback} />);

    handlers.contextmenu({
      latlng: { lat: 45.5, lng: -73.6 },
      originalEvent: { target: {}, preventDefault },
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalledWith({
      lat: 45.5,
      lng: -73.6,
      source: 'map',
    });
  });

  it('mobile: contextmenu on marker does NOT set location', () => {
    const mockCallback = vi.fn();
    const preventDefault = vi.fn();
    const handlers = {};
    useIsMobileMock.mockReturnValue(true);
    mockMap.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });

    render(<MapClickHandler onMapClick={mockCallback} />);

    const markerTarget = {
      classList: { contains: (cls) => cls === 'leaflet-marker-icon' },
    };

    handlers.contextmenu({
      latlng: { lat: 45.5, lng: -73.6 },
      originalEvent: { target: markerTarget, preventDefault },
    });

    expect(mockCallback).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('cleanup: unmounting removes event listeners', () => {
    const mockCallback = vi.fn();
    useIsMobileMock.mockReturnValue(true);

    const { unmount } = render(<MapClickHandler onMapClick={mockCallback} />);

    unmount();

    expect(mockMap.off).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockMap.off).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });
});
