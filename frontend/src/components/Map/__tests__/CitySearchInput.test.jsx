import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CitySearchInput from '../CitySearchInput';

const mockCallback = vi.fn();

// Mock cities data that mimics the real cities.json structure
const mockCitiesData = [
  { name: 'Sherbrooke', lat: 45.4042, lon: -71.8929, region: 'Estrie' },
  { name: 'Sherbrooke-Ouest', lat: 45.38, lon: -71.95, region: 'Estrie' },
  { name: 'Montreal', lat: 45.5017, lon: -73.5673, region: 'Montreal' },
  { name: 'Quebec City', lat: 46.8139, lon: -71.2080, region: 'Quebec' },
  { name: 'Laval', lat: 45.6066, lon: -73.7124, region: 'Laval' },
];

// Mock fetch for cities.json
const mockFetch = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = mockFetch;
  
  // Simulate successful load of cities.json
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => mockCitiesData,
  });
});

describe('CitySearchInput', () => {
  it('renders with placeholder', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
  });

  it('shows dropdown after typing partial match', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    await fireEvent.change(input, { target: { value: 'Sher' } });
    
    await waitFor(() => {
      expect(screen.getByText('Sherbrooke, Estrie')).toBeInTheDocument();
    });
  });

  it('matches city name and region', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    // Search by region name
    await fireEvent.change(input, { target: { value: 'Estrie' } });
    
    await waitFor(() => {
      expect(screen.getByText('Sherbrooke, Estrie')).toBeInTheDocument();
    });
  });

  it('calls callback when selecting from dropdown', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    await fireEvent.change(input, { target: { value: 'Mont' } });
    
    await waitFor(() => {
      expect(screen.getByText('Montreal, Montreal')).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByText('Montreal, Montreal'));

    expect(mockCallback).toHaveBeenCalledWith(
      { lat: 45.5017, lng: -73.5673, source: 'city' },
      'Montreal'
    );
  });

  it('displays "no results" message', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });
    
    await fireEvent.change(input, { target: { value: 'NonExistentCityXYZ' } });
    
    await waitFor(() => {
      expect(screen.getByText(/aucune ville/i)).toBeInTheDocument();
    });
  });
});
