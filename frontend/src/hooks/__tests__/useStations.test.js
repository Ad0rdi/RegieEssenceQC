import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStations } from '../useStations';
import { fetchStations } from '../../services/dataService';

vi.mock('../../services/dataService', () => ({
  fetchStations: vi.fn(),
}));

const mockDTO = (data) => data;

describe('useStations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all stations when no fuel types are provided (default)', async () => {
const mockData = {
      features: [
        {
          properties: {
            id: '1',
            name: 'S1',
            address: 'A1',
            prices: {
              'Régulier': '150.9',
              'Super': '160.9',
              'Diesel': '140.9'
            }
          },
          geometry: { type: 'Point', coordinates: [0, 0] }
        },
        {
          properties: {
            id: '2',
            name: 'S2',
            address: 'A2',
            prices: {
              'Régulier': '170.9'
            }
          },
          geometry: { type: 'Point', coordinates: [1, 1] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockDTO(mockData));

    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(2);
  });

  it('should filter stations based on selectedFuelTypes', async () => {
    const mockData = {
      features: [
        {
          properties: {
            id: '1',
            name: 'S1',
            address: 'A1',
            prices: {
              'Régulier': '150.9',
              'Super': '160.9',
              'Diesel': '140.9'
            }
          },
          geometry: { type: 'Point', coordinates: [0, 0] }
        },
        {
          properties: {
            id: '2',
            name: 'S2',
            address: 'A2',
            prices: { 'Régulier': '170.9' }
          },
          geometry: { type: 'Point', coordinates: [1, 1] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockDTO(mockData));

     // Filter for 'super' only
     const { result } = renderHook(() => useStations(['super', 'Super']));


    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only S1 has a valid super price
    expect(result.current.stations).toHaveLength(1);
    expect(result.current.stations[0].id).toBe('1');
  });

  it('should return empty stations if no stations match the fuel type', async () => {
    const mockData = {
      features: [
        {
          properties: {
            id: '1',
            name: 'S1',
            address: 'A1',
            prices: {
              'Régulier': '150.9'
            }
          },
          geometry: { type: 'Point', coordinates: [0, 0] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockDTO(mockData));

    // Filter for 'Super' only
    const { result } = renderHook(() => useStations(['Super']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(0);
  });
});

  it('should return all stations when no fuel types are provided (default)', async () => {
    const mockData = {
      features: [
        {
          properties: {
            id: '1',
            name: 'S1',
            address: 'A1',
            prices: {
              'Régulier': '150.9',
              'Super': '160.9',
              'Diesel': '140.9'
            }
          },
          geometry: { type: 'Point', coordinates: [0, 0] }
        },
        {
          properties: {
            id: '2',
            name: 'S2',
            address: 'A2',
            prices: { 'Régulier': '170.9' }
          },
          geometry: { type: 'Point', coordinates: [1, 1] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockDTO(mockData));

    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(2);
  });

  it('should filter stations based on selectedFuelTypes', async () => {
    const mockData = {
      features: [
        {
          properties: {
            id: '1',
            name: 'S1',
            address: 'A1',
            prices: {
              'Régulier': '150.9'
            }
          },
          geometry: { type: 'Point', coordinates: [0, 0] },
            prices: {
              'Régulier': '150.9',
              'Super': '160.9',
              'Diesel': '140.9'
            }
          }
        ,
        {
          properties: {
            id: '2',
            name: 'S2',
            address: 'A2',
            prices: { 'Régulier': '170.9' }
          },
          geometry: { type: 'Point', coordinates: [1, 1] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockDTO(mockData));

    // Filter for 'super' only
    const { result } = renderHook(() => useStations(['super']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only S1 has a valid super price
    expect(result.current.stations).toHaveLength(1);
    expect(result.current.stations[0].id).toBe('1');
  });


  it('should return empty stations if no stations match the fuel type', async () => {
    const mockData = {
      features: [
        {
          properties: {
            id: '1',
            name: 'S1',
            address: 'A1',
            prices: {
              regular: 1.50
            }
          },
          geometry: { type: 'Point', coordinates: [0, 0] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockDTO(mockData));

    const { result } = renderHook(() => useStations(['super']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(0);
  });

