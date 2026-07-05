import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { getCache, setCache, clearCache, isCacheValid, getPref, setPref } from '../storage';
import { transformCachedStations } from '../../services/dataService';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IndexedDB caching', () => {
  it('getCache returns null when no cache exists', async () => {
    const result = await getCache();
    expect(result).toBeNull();
  });

  it('setCache stores data and returns a promise', async () => {
    const testData = { type: 'FeatureCollection', features: [] };
    await setCache(testData);
    await expect(setCache(testData)).resolves.toBeUndefined();
  });

  it('getCache returns cached data after setCache', async () => {
    const testData = { type: 'FeatureCollection', features: [] };
    await setCache(testData);
    const result = await getCache();
    expect(result.data).toEqual(testData);
  });

  it('clearCache removes cached data', async () => {
    const testData = { type: 'FeatureCollection', features: [] };
    await setCache(testData);
    await clearCache();
    const result = await getCache();
    expect(result).toBeNull();
  });

  it('isCacheValid returns true within TTL', () => {
    const fetchedAt = Date.now() - 1000;
    expect(isCacheValid(fetchedAt, 5 * 60 * 1000)).toBe(true);
  });

  it('isCacheValid returns false past TTL', () => {
    const fetchedAt = Date.now() - 10 * 60 * 1000;
    expect(isCacheValid(fetchedAt, 5 * 60 * 1000)).toBe(false);
  });
});

describe('localStorage persistence', () => {
  it('getPref returns default when key does not exist', () => {
    const result = getPref('nonexistent', 'default');
    expect(result).toBe('default');
  });

  it('getPref returns parsed value when key exists', () => {
    localStorage.setItem('test_key', '"stored_value"');
    const result = getPref('test_key', 'default');
    expect(result).toBe('stored_value');
  });

  it('getPref returns default on invalid JSON', () => {
    localStorage.setItem('bad_key', '{invalid json!!!');
    const result = getPref('bad_key', 'default');
    expect(result).toBe('default');
  });

  it('setPref stores serialized JSON', () => {
    setPref('test_key', { foo: 'bar', num: 42 });
    const stored = localStorage.getItem('test_key');
    expect(stored).toBe('{"foo":"bar","num":42}');
  });
});

describe('transformCachedStations', () => {
  it('transforms valid GeoJSON', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { coordinates: [-73.5, 45.5] },
          properties: {
            id: 's1',
            Name: 'Station Alpha',
            brand: 'Esso',
            Prices: [
              { GasType: 'régulier', Price: '149.9¢', IsAvailable: true },
              { GasType: 'super', Price: '159.9¢', IsAvailable: true },
              { GasType: 'diesel', Price: '139.9¢', IsAvailable: true },
            ],
          },
        },
      ],
    };

    const result = transformCachedStations(geojson);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 's1',
      name: 'Station Alpha',
      brand: 'Esso',
      lat: 45.5,
      lng: -73.5,
      prices: {
        regular: 1.499,
        super: 1.599,
        diesel: 1.399,
      },
    });
  });

  it('returns empty for invalid input', () => {
    expect(transformCachedStations(null)).toEqual([]);
    expect(transformCachedStations({})).toEqual([]);
    expect(transformCachedStations({ features: 'not-an-array' })).toEqual([]);
  });

  it('filters by selected fuel types', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { coordinates: [-73.5, 45.5] },
          properties: {
            id: 's1',
            Name: 'Regular Only Station',
            Prices: [
              { GasType: 'régulier', Price: '149.9¢', IsAvailable: true },
            ],
          },
        },
      ],
    };

    const result = transformCachedStations(geojson, ['super', 'diesel']);
    expect(result).toHaveLength(0);
  });
});
