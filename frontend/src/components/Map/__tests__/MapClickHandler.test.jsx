import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';
import MapClickHandler from '../MapClickHandler';

const mockMap = {
  on: vi.fn(),
  off: vi.fn(),
  getPane: vi.fn(),
  createPane: vi.fn(),
  removeLayer: vi.fn(),
  eachLayer: vi.fn((cb) => {}),
  hasLayer: vi.fn(() => false),
};

let handlers = {};

function createPopupMock(buttons = {}) {
  const setLatLngSpy = vi.fn().mockReturnThis();
  const setContentSpy = vi.fn().mockReturnThis();
  const addToSpy = vi.fn().mockReturnThis();
  const createBtn = (mock) => mock ?? {
    click: vi.fn(),
    mousedown: vi.fn(),
    mouseup: vi.fn(),
  };
  const yesBtn = createBtn(buttons.yes);
  const noBtn = createBtn(buttons.no);
  const getElementSpy = vi.fn(() => ({
    querySelector: (selector) => {
      if (selector === '.map-confirm-yes') return yesBtn;
      if (selector === '.map-confirm-no') return noBtn;
      return null;
    },
  }));
  return {
    setLatLng: setLatLngSpy,
    setContent: setContentSpy,
    addTo: addToSpy,
    getElement: getElementSpy,
  };
}

const { useIsMobileMock, mockLMock } = vi.hoisted(() => {
  const mobileMock = vi.fn();
  mobileMock.mockReturnValue(false);
  const popupSpy = vi.fn();
  const DomEvent = {
    disableClickPropagation: vi.fn(),
    disableScrollPropagation: vi.fn(),
    on: vi.fn(),
    stopPropagation: vi.fn(),
  };
  return {
    useIsMobileMock: mobileMock,
    mockLMock: {
      popup: popupSpy,
      DomEvent,
    },
  };
});

vi.mock('react-leaflet', () => ({
  useMap: vi.fn(() => mockMap),
}));

vi.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: useIsMobileMock,
}));

vi.mock('leaflet', () => ({
  default: mockLMock,
}));

describe('MapClickHandler', () => {
  let mockCallback;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.keys(handlers).forEach(k => delete handlers[k]);
    useIsMobileMock.mockReturnValue(false);
    mockMap.on.mockImplementation((event, handler) => {
      const events = event.split(' ');
      for (const e of events) {
        handlers[e] = handler;
      }
    });
    mockMap.removeLayer.mockImplementation(() => {});
    mockLMock.DomEvent.disableClickPropagation.mockImplementation(() => {});
    mockLMock.DomEvent.disableScrollPropagation.mockImplementation(() => {});
    const popupInstance = createPopupMock();
    mockLMock.popup.mockReturnValue(popupInstance);
    mockCallback = vi.fn();
  });

 async function fireClick(lat, lng, target = {}) {
    const stopImmediatePropagationSpy = vi.fn();
    await act(async () => {
      handlers.click({
        latlng: { lat, lng },
        originalEvent: { target },
        stopImmediatePropagation: stopImmediatePropagationSpy,
      });
    });
    return stopImmediatePropagationSpy;
  }

  function fireMapMove() {
    act(() => {
      handlers.moveend?.();
      handlers.zoomend?.();
    });
  }

  async function fireContextmenu(lat, lng, target = {}) {
    const preventDefault = vi.fn();
    await act(async () => {
      handlers.contextmenu({
        latlng: { lat, lng },
        originalEvent: { target, preventDefault },
      });
    });
    return preventDefault;
  }

  it('desktop: click on map shows popup', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });
  });

  it('desktop: popup shows correct coordinates', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });

    const popupInstance = mockLMock.popup.mock.results[0].value;
    expect(popupInstance.setLatLng).toHaveBeenCalledWith([45.5, -73.6]);
  });

  it('desktop: click on marker does NOT show popup', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    const markerTarget = {
      classList: { contains: (cls) => cls === 'leaflet-marker-icon' },
    };

    await fireClick(45.5, -73.6, markerTarget);

    expect(mockLMock.popup).not.toHaveBeenCalled();
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('desktop: clicking "Oui" confirms and calls onMapClick', async () => {
    const yesBtnSpy = vi.fn();
    const noBtnSpy = vi.fn();
    const popupInstance = createPopupMock({ yes: yesBtnSpy, no: noBtnSpy });
    mockLMock.popup.mockReturnValue(popupInstance);

    render(<MapClickHandler onMapClick={mockCallback} />);

    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.DomEvent.on).toHaveBeenCalled();
    });

    const yesCall = mockLMock.DomEvent.on.mock.calls.find(
      (c) => c[1] === 'click'
    );

    expect(yesCall).toBeDefined();
    await act(async () => {
      const fakeEvent = { stopImmediatePropagation: vi.fn() };
      yesCall[2](fakeEvent);
    });
    expect(mockCallback).toHaveBeenCalledWith({
      lat: 45.5,
      lng: -73.6,
      source: 'map',
    });
  });

  it('desktop: clicking elsewhere closes existing popup', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    // First click opens popup
    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });

    // Click elsewhere (different coordinates)
    await act(async () => {
      handlers.click({
        latlng: { lat: 46.0, lng: -74.0 },
        originalEvent: { target: {} },
      });
    });

    // Popup should be removed (removeLayer called)
    expect(mockMap.removeLayer).toHaveBeenCalled();

    // No new popup should be created (just closed)
    expect(mockLMock.popup.mock.calls.length).toBe(1);
  });

  it('desktop: clicking same location closes popup', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    // First click opens popup
    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });

    // Click same location
    await act(async () => {
      handlers.click({
        latlng: { lat: 45.5, lng: -73.6 },
        originalEvent: { target: {} },
      });
    });

    // Popup should be closed (removeLayer called)
    expect(mockMap.removeLayer).toHaveBeenCalled();

    // No new popup created
    expect(mockLMock.popup.mock.calls.length).toBe(1);
  });

  it('mobile: click does NOT show popup', async () => {
    useIsMobileMock.mockReturnValue(true);

    render(<MapClickHandler onMapClick={mockCallback} />);

    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    });

    expect(handlers.click).toBeUndefined();

    expect(mockLMock.popup).not.toHaveBeenCalled();
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('mobile: contextmenu (long-press) shows popup', async () => {
    useIsMobileMock.mockReturnValue(true);

    render(<MapClickHandler onMapClick={mockCallback} />);

    const preventDefault = await fireContextmenu(45.5, -73.6);

    expect(preventDefault).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });
  });

  it('mobile: contextmenu on marker does NOT show popup', async () => {
    useIsMobileMock.mockReturnValue(true);

    render(<MapClickHandler onMapClick={mockCallback} />);

    const markerTarget = {
      classList: { contains: (cls) => cls === 'leaflet-marker-icon' },
    };
    const preventDefault = await fireContextmenu(45.5, -73.6, markerTarget);

    expect(mockLMock.popup).not.toHaveBeenCalled();
    expect(mockCallback).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('popup is cleaned up on unmount', async () => {
    const popupInstance = createPopupMock();
    mockLMock.popup.mockReturnValue(popupInstance);

    const { unmount } = render(<MapClickHandler onMapClick={mockCallback} />);

    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });

    unmount();

    expect(mockMap.removeLayer).toHaveBeenCalledWith(popupInstance);
  });

  it('desktop: click on control element does NOT show popup', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    const controlTarget = {
      classList: { contains: (cls) => ['leaflet-control', 'leaflet-gps-btn', 'leaflet-custom-zoom'].includes(cls) },
    };

    await fireClick(45.5, -73.6, controlTarget);

    expect(mockLMock.popup).not.toHaveBeenCalled();
    expect(mockCallback).not.toHaveBeenCalled();
  });

 it('desktop: map move closes popup', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });

    await act(async () => {
      handlers.zoomend?.();
      handlers.moveend?.();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(mockMap.removeLayer).toHaveBeenCalled();
  });

  it('desktop: closing station popup prevents marker popup on next click', async () => {
    render(<MapClickHandler onMapClick={mockCallback} />);

    // First click opens a location marker popup
    await fireClick(45.5, -73.6);

    await waitFor(() => {
      expect(mockLMock.popup).toHaveBeenCalled();
    });

    // Simulate station popup closing via Leaflet's popupclose event
    await act(async () => {
      handlers.popupclose?.();
      handlers.preclick?.();
      await new Promise(r => setTimeout(r, 0));
    });

    const popupCallCount = mockLMock.popup.mock.calls.length;

    // Click elsewhere should NOT create another popup
    await act(async () => {
      handlers.click({
        latlng: { lat: 46.0, lng: -74.0 },
        originalEvent: { target: {} },
      });
    });

    expect(mockLMock.popup.mock.calls.length).toBe(popupCallCount);
  });
});
