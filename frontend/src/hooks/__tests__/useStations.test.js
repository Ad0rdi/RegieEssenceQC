import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

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

function transformToStations(data, selectedFuelTypes) {
  if (!data || !Array.isArray(data.features)) return [];
  const TYPE_MAP = {
    'régulier': 'regular', 'super': 'super', 'diesel': 'diesel',
    'Régulier': 'regular', 'Super': 'super', 'Diesel': 'diesel', 'regular': 'regular'
  };
  return data.features
    .filter(f => f.geometry?.coordinates?.length === 2 && f.properties)
    .map((feature, index) => {
      const prices = {};
      const props = feature.properties;
      if (Array.isArray(props.Prices)) {
        props.Prices.forEach(p => {
          const mappedType = TYPE_MAP[p.GasType];
          if (mappedType && p.Price && typeof p.Price === 'string' && p.IsAvailable) {
            prices[mappedType] = parseFloat(p.Price.replace('¢', '')) / 100;
          }
        });
      } else if (props.prices && typeof props.prices === 'object') {
        for (const [key, value] of Object.entries(props.prices)) {
          const mappedType = TYPE_MAP[key];
          if (mappedType) {
            prices[mappedType] = typeof value === 'string'
              ? parseFloat(value.replace(/[^\d.]/g, ''))
              : value;
          }
        }
      }
      return {
        id: props.id || 'station-' + index,
        name: props.Name || props.name || props.id,
        brand: props.brand,
        company: props.Name || props.company,
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        prices,
        address: props.Address || props.address
      };
    })
    .filter(station =>
      selectedFuelTypes.some(type =>
        station.prices?.[type] !== undefined && station.prices?.[type] !== null
      )
    );
}

vi.mock('../../services/dataService', () => ({
  fetchStations: vi.fn(),
  useCachedData: vi.fn(),
  transformCachedStations: vi.fn((data, selectedFuelTypes) => transformToStations(data, selectedFuelTypes)),
}));

vi.mock('../../utils/storage', () => ({
  setCache: vi.fn(),
}));

describe('useStations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all stations when no fuel types are provided (default)', async () => {
    const { fetchStations, useCachedData, transformCachedStations } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.all));
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(transformCachedStations).toHaveBeenCalled();
    expect(result.current.stations).toHaveLength(2);
  });

  it('should filter stations based on selectedFuelTypes', async () => {
    const { fetchStations, useCachedData } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.superOnly));
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations(['super', 'Super']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(1);
    expect(result.current.stations[0].id).toBe('1');
  });

  it('should return empty stations if no stations match the fuel type', async () => {
    const { fetchStations, useCachedData } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.regularOnly));
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations(['diesel']));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stations).toHaveLength(0);
  });

  it('should handle network errors gracefully', async () => {
    const { fetchStations, useCachedData } = await import('../../services/dataService');
    fetchStations.mockRejectedValue(new Error('Network failed'));
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failed');
    expect(result.current.stations).toHaveLength(0);
  });

  it('should return fromCache: true when using cached data', async () => {
    const { useCachedData } = await import('../../services/dataService');
    const cachedStations = mockFeatures.all;
    useCachedData.mockResolvedValue({
      stations: cachedStations,
      generatedAt: null,
    });

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => {
      expect(result.current.fromCache).toBe(true);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should return fromCache: false after fresh fetch', async () => {
    const { fetchStations, useCachedData } = await import('../../services/dataService');
    fetchStations.mockResolvedValue(buildGeoJSON(mockFeatures.all));
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromCache).toBe(false);
  });

  it('should cache data after fresh fetch', async () => {
    const { fetchStations, useCachedData } = await import('../../services/dataService');
    const { setCache } = await import('../../utils/storage');
    const geojson = buildGeoJSON(mockFeatures.all);
    fetchStations.mockResolvedValue(geojson);
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    renderHook(() => useStations());

    await waitFor(() => expect(setCache).toHaveBeenCalled());

    expect(setCache).toHaveBeenCalledWith(geojson);
  });

  it('should not cache data on error', async () => {
    const { fetchStations, useCachedData } = await import('../../services/dataService');
    const { setCache } = await import('../../utils/storage');
    fetchStations.mockRejectedValue(new Error('Network failed'));
    useCachedData.mockResolvedValue(null);

    const { useStations } = await import('../useStations');
    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(setCache).not.toHaveBeenCalled();
  });
});
