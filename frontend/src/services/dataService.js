import pako from 'pako';
import { getCache, isCacheValid, clearCache, setCache, getDatasaverMode } from '../utils/storage';

const GEOJSON_URL = 'https://regieessencequebec.ca/stations.geojson.gz';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processData = (uint8Array) => {
  try {
    // Check if it's actually gzipped (magic bytes 1f 8b)
    if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
      const decompressed = pako.ungzip(uint8Array, { to: 'string' });
      return JSON.parse(decompressed);
    } else {
      // If not gzipped, try parsing as raw JSON
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(uint8Array);
      return JSON.parse(text);
    }
  } catch (err) {
    throw new Error(`Failed to process data: ${err.message}`);
  }
};

export const fetchStations = async (retries = MAX_RETRIES) => {
  try {
    const response = await fetch(GEOJSON_URL);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const parsed = processData(uint8Array);
    return parsed;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    await delay(RETRY_DELAY_MS * (MAX_RETRIES - retries + 1));
    return fetchStations(retries - 1);
  }
};

const TYPE_MAP = {
  'régulier': 'regular',
  'super': 'super',
  'diesel': 'diesel',
  'Régulier': 'regular',
  'Super': 'super',
  'Diesel': 'diesel',
  'regular': 'regular'
};

export function transformCachedStations(data, selectedFuelTypes = ['regular', 'super', 'diesel']) {
  if (!data || !Array.isArray(data.features)) return [];

  return data.features
    .filter(feature =>
      feature.geometry?.coordinates?.length === 2 &&
      feature.properties
    )
    .map((feature, index) => {
      const prices = {};
      const props = feature.properties;

      if (Array.isArray(props.Prices)) {
        props.Prices.forEach(p => {
          const mappedType = TYPE_MAP[p.GasType];
          if (mappedType && p.Price && typeof p.Price === 'string' && p.IsAvailable) {
            const priceValue = parseFloat(p.Price.replace('¢', '')) / 100;
            prices[mappedType] = priceValue;
          }
        });
      } else if (props.prices && typeof props.prices === 'object') {
        for (const [key, value] of Object.entries(props.prices)) {
          const mappedType = TYPE_MAP[key];
          if (mappedType) {
            const priceValue = typeof value === 'string'
              ? parseFloat(value.replace(/[^\d.]/g, ''))
              : value;
            prices[mappedType] = priceValue;
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

export async function useCachedData(selectedFuelTypes) {
  try {
    const cache = await getCache();
    if (!cache) return null;

    const ttlMs = getDatasaverMode() ? 20 * 60 * 1000 : 5 * 60 * 1000;
    if (!isCacheValid(cache.fetchedAt, ttlMs)) {
      await clearCache();
      return null;
    }

    const stations = transformCachedStations(cache.data, selectedFuelTypes);
    return {
      stations,
      generatedAt: cache.data?.metadata?.generated_at ?? null,
    };
  } catch {
    return null;
  }
}
