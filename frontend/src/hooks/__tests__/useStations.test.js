import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStations } from '../useStations';
import { fetchStations } from '../../services/dataService';

vi.mock('../../services/dataService', () => ({
  fetchStations: vi.fn(),
}));

describe('useStations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all stations when no fuel types are provided (default)', async () => {
    const mockData = {
      features: [
        {
          properties: { id: '1', name: 'S1', regular: 1.5, super: 1.6, diesel: 1.4, address: 'A1' },
          geometry: { coordinates: [0, 0] }
        },
        {
          properties: { id: '2', name: 'S2', regular: 1.7, super: null, diesel: null, address: 'A2' },
          geometry: { coordinates: [1, 1] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(2);
  });

  it('should filter stations based on selectedFuelTypes', async () => {
    const mockData = {
      features: [
        {
          properties: { id: '1', name: 'S1', regular: 1.5, super: 1.6, diesel: 1.4, address: 'A1' },
          geometry: { coordinates: [0, 0] }
        },
        {
          properties: { id: '2', name: 'S2', regular: 1.7, super: null, diesel: null, address: 'A2' },
          geometry: { coordinates: [1, 1] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockData);

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
          properties: { id: '1', name: 'S1', regular: 1.5, super: null, diesel: null, address: 'A1' },
          geometry: { coordinates: [0, 0] }
        }
      ]
    };
    fetchStations.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStations(['super']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(0);
  });
});
