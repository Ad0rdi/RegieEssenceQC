import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CitySearchInput from '../CitySearchInput';

const mockCallback = vi.fn();
const mockNominatimFetch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = mockNominatimFetch;
});

describe('CitySearchInput', () => {
  it('renders with placeholder', () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);
    expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
  });

  it('shows dropdown after typing', async () => {
    mockNominatimFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { display_name: 'Sherbrooke, QC', lat: '45.4042', lon: '-71.8929' },
      ],
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Sher' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Sherbrooke, QC')).toBeInTheDocument();
    });
  });

  it('calls callback when selecting from dropdown', async () => {
    mockNominatimFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { display_name: 'Montreal, QC', lat: '45.5017', lon: '-73.5673' },
      ],
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Mont' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Montreal, QC')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Montreal, QC'));
    });

    expect(mockCallback).toHaveBeenCalledWith(
      { lat: 45.5017, lng: -73.5673, source: 'city' },
      'Montreal, QC'
    );
  });

  it('displays error on network failure', async () => {
    mockNominatimFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test' } });
    });

    await waitFor(() => {
      const errorMessage = document.querySelector('.error-message');
      expect(errorMessage).toHaveTextContent(/erreur/i);
    });
  });

  it('displays "no results" message', async () => {
    mockNominatimFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'NonExistentCityXYZ' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/aucune ville/i)).toBeInTheDocument();
    });
  });
});
