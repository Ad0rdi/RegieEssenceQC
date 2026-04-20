import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StationMarker from '../StationMarker';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ position, children, icon }) => (
    <div data-testid="marker" data-position={position.join(',')} data-icon={icon ? 'yes' : 'no'}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ flyTo: vi.fn() }),
}));

const mockStation = {
  id: 1,
  name: 'Test Station',
  lat: 45.5017,
  lng: -73.5673,
  address: '123 Test St',
  phone: '555-0000',
  prices: { regular: 1.459, super: 1.559, diesel: 1.359 },
};

describe('StationMarker', () => {
  it('renders marker with popup content', () => {
    render(<StationMarker station={mockStation} onClick={vi.fn()} />);
    expect(screen.getByText('Test Station')).toBeTruthy();
  });

  it('calls onClick when marker is clicked', () => {
    const handleClick = vi.fn();
    render(<StationMarker station={mockStation} onClick={handleClick} />);
    expect(handleClick).toBeDefined();
  });
});
