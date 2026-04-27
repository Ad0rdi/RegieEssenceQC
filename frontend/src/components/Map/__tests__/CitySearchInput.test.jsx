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
  localStorage.clear();

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

  it('toggles to precise mode when clicking the toggle button', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Click the toggle button to switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    // Placeholder should change
    expect(screen.getByPlaceholderText(/rechercher une adresse/i)).toBeInTheDocument();
  });

  it('shows search button only in precise mode', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Search button should NOT be visible in city mode
    expect(screen.queryByTitle('Rechercher')).not.toBeInTheDocument();

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    // Type something to enable the search button
    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: 'montreal' } });

    // Search button should now be visible and enabled
    const searchBtn = screen.getByTitle('Rechercher');
    expect(searchBtn).toBeInTheDocument();
    expect(searchBtn).not.toBeDisabled();
  });

  it('auto-resets to city mode after selecting an address result', async () => {
    // Mock cities.json load
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockCitiesData,
    });

    // Mock Nominatim API response
    const nominatimResponse = [
      {
        lat: '45.5017',
        lon: '-73.5673',
        display_name: '1234 Rue Sainte-Catherine, Montreal, QC, Canada',
        address: {
          house_number: '1234',
          road: 'Rue Sainte-Catherine',
          city: 'Montreal',
          postcode: 'QC',
        }
      }
    ];

    // Chain mocks: first call is cities.json, second is Nominatim
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockCitiesData })
      .mockResolvedValueOnce({ ok: true, json: async () => nominatimResponse });

    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: '1234 sainte-catherine' } });

    // Click search button
    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('1234, Rue Sainte-Catherine, Montreal, QC')).toBeInTheDocument();
    });

    // Select the result
    await fireEvent.click(screen.getByText('1234, Rue Sainte-Catherine, Montreal, QC'));

    // Toggle should have auto-reset: placeholder should be back to city mode
    expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();

    // Callback should have been called with address source
    expect(mockCallback).toHaveBeenCalledWith(
      { lat: 45.5017, lng: -73.5673, source: 'address' },
      '1234, Rue Sainte-Catherine, Montreal, QC'
    );
  });

  it('displays no results message for precise mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [], // No results from Nominatim
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: '1234 xyznonexistent' } });

    // Click search button
    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/aucun résultat/i)).toBeInTheDocument();
    });
  });

  it('hides city results while typing in precise mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockCitiesData,
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // First verify city mode works
    const cityInput = screen.getByPlaceholderText(/rechercher une ville/i);
    await fireEvent.change(cityInput, { target: { value: 'Sher' } });

    await waitFor(() => {
      expect(screen.getByText('Sherbrooke, Estrie')).toBeInTheDocument();
    });

    // Clear and switch to precise mode
    await fireEvent.change(cityInput, { target: { value: '' } });
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une adresse/i)).toBeInTheDocument();
    });

    // Type in precise mode - should NOT show city results
    const preciseInput = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(preciseInput, { target: { value: 'Sher' } });

    await waitFor(() => {
      expect(screen.queryByText('Sherbrooke, Estrie')).not.toBeInTheDocument();
    });
  });

  it('clears city results when toggling to precise mode', async () => {
    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Show city results
    const input = screen.getByPlaceholderText(/rechercher une ville/i);
    await fireEvent.change(input, { target: { value: 'Montreal' } });

    await waitFor(() => {
      expect(screen.getByText('Montreal, Montreal')).toBeInTheDocument();
    });

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une adresse/i)).toBeInTheDocument();
    });

    // City results should be cleared
    expect(screen.queryByText('Montreal, Montreal')).not.toBeInTheDocument();
  });

  it('shows formatted address in precise mode results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '45.5017',
          lon: '-73.5673',
          display_name: '1234 Rue Sainte-Catherine, Montreal, QC H3G 1P3, Canada',
          address: {
            house_number: '1234',
            road: 'Rue Sainte-Catherine',
            city: 'Montréal',
            postcode: 'H3G 1P3',
          }
        }
      ],
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: '1234 sainte-catherine' } });

    // Click search button
    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('1234, Rue Sainte-Catherine, Montréal, H3G 1P3')).toBeInTheDocument();
    });
  });

  it('does not search when query has no numbers in precise mode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '45.5017',
          lon: '-73.5673',
          display_name: '1234 Rue Sainte-Catherine, Montreal, QC H3G 1P3, Canada',
          address: {
            house_number: '1234',
            road: 'Rue Sainte-Catherine',
            city: 'Montréal',
            postcode: 'H3G 1P3',
          }
        }
      ],
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: 'sainte-catherine' } });

    // Click search button - should NOT make request because no numbers in query
    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);

    // No dropdown should appear since search was skipped
    await waitFor(() => {
      expect(screen.queryByText(/aucun résultat/i)).not.toBeInTheDocument();
    });

    // The API should NOT have been called
    const calls = mockFetch.mock.calls;
    const nominatimCalls = calls.filter(c => c[0] && c[0].includes('nominatim'));
    expect(nominatimCalls.length).toBe(0);
  });

  it('does not search when query has only a number without a word', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CitySearchInput onCitySelect={mockCallback} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/rechercher une ville/i)).toBeInTheDocument();
    });

    // Switch to precise mode
    const toggleButton = screen.getByTitle('Mode précis');
    await fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/rechercher une adresse/i);
    await fireEvent.change(input, { target: { value: '1234' } });

    const searchBtn = screen.getByTitle('Rechercher');
    await fireEvent.click(searchBtn);

    // No dropdown should appear since search was skipped
    await waitFor(() => {
      expect(screen.queryByText(/aucun résultat/i)).not.toBeInTheDocument();
    });

    const calls = mockFetch.mock.calls;
    const nominatimCalls = calls.filter(c => c[0] && c[0].includes('nominatim'));
    expect(nominatimCalls.length).toBe(0);
  });
});
