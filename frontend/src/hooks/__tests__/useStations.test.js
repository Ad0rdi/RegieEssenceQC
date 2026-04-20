import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFeatures = {
  all: [
    {
      properties: { name: 'S1', address: 'A1', prices: { 'Régulier': '150.9', 'Super': '160.9', 'Diesel': '140.9' } },
      geometry: { type: 'Point', coordinates: [0, 0] }
    },
    {
      properties: { name: 'S2', address: 'A2', prices: { 'Régulier': '170.9' } },
      geometry: { type: 'Point', coordinates: [1, 1] }
    }
  ],
  superOnly: [
    {
      properties: { name: 'S1', address: 'A1', prices: { 'Régulier': '150.9', 'Super': '160.9', 'Diesel': '140.9' } },
      geometry: { type: 'Point', coordinates: [0, 0] }
    },
    {
      properties: { name: 'S2', address: 'A2', prices: { 'Régulier': '170.9' } },
      geometry: { type: 'Point', coordinates: [1, 1] }
    }
  ],
  regularOnly: [
    {
      properties: { name: 'S1', address: 'A1', prices: { 'Régulier': '150.9' } },
      geometry: { type: 'Point', coordinates: [0, 0] }
    }
  ]
};

function buildGeoJSON(features) {
  return {
    features: features.map((f, i) => ({ ...f, properties: { ...f.properties, id: f.properties.id || String(i + 1) } }))
  };
}

vi.mock('../../services/dataService', () => ({
  fetchStations: vi.fn()
}));

describe('useStations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all stations when no fuel types are provided (default)', async () => {
    const { fetchStations } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.all));

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(2);
  });

  it('should filter stations based on selectedFuelTypes', async () => {
    const { fetchStations } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.superOnly));

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations(['super', 'Super']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(1);
    expect(result.current.stations[0].id).toBe('1');
  });

  it('should return empty stations if no stations match the fuel type', async () => {
    const { fetchStations } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.regularOnly));

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations(['diesel']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(0);
  });

  it('should handle network errors gracefully', async () => {
    const { fetchStations } = await import('../../services/dataService');
    fetchStations.mockRejectedValue(new Error('Network failed'));

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failed');
    expect(result.current.stations).toHaveLength(0);
  });
});
