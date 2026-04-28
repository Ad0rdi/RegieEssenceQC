// src/utils/nominatimSearch.js

import { useCallback, useRef, useState } from 'react';

const QUEBEC_VIEWBOX = '-74.5,44.5,-57.5,52.5'; // west,south,east,north (Quebec province bounds)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const RATE_LIMIT_DELAY = 1000; // 1 request per second (Nominatim requirement)
const POSTAL_CODE_RE = /^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/;

const QUEBEC_REGIONS = new Set([
  'estrie', 'outaouais', 'saguenay', 'mauricie', 'laurentides',
  'chaudiere-appalaches', 'bas-saint-laurent', 'gaspesie', 'cote-nord',
  'abitibi-temiscamingue', 'nord-du-quebec', 'quebec'
]);

function normalizeCityName(name) {
  return name
    .toLowerCase()
    .replace(/[áàâãäå]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ÁÀÂÃÄÅ]/g, 'A')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[ÓÒÔÕÖ]/g, 'O')
    .replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/[Ñ]/g, 'N')
    .replace(/[Ç]/g, 'C')
    .replace(/['']/g, '')
    .replace(/[-\s]+/g, ' ')
    .trim();
}

let citySetPromise = null;
async function getCitySet() {
  if (citySetPromise) return citySetPromise;
  citySetPromise = fetch(`${import.meta.env.BASE_URL}cities.json`)
    .then(res => res.json())
    .then(cities => new Set(cities.map(c => normalizeCityName(c.name))))
    .catch(() => new Set());
  return citySetPromise;
}

async function parseDisplayName(displayName) {
  console.log('📝 parseDisplayName input:', displayName);
  if (!displayName) return null;

  const rawParts = displayName.split(',').map(p => p.trim()).filter(Boolean);
  console.log('   rawParts:', rawParts);

  if (rawParts.length === 0) return null;

  const country = rawParts[rawParts.length - 1];
  if (country.toLowerCase().includes('canada')) {
    rawParts.pop();
    console.log('   removed country, remaining:', rawParts);
  }

  const remaining = rawParts.slice();
  let postalCode = '';
  const lastIdx = remaining.length - 1;
  if (POSTAL_CODE_RE.test(remaining[lastIdx])) {
    postalCode = remaining[lastIdx];
    remaining.pop();
    console.log('   found postal code:', postalCode);
  }

  // Strip regions/provinces from the end before searching for cities
  while (remaining.length > 0) {
    const normalized = normalizeCityName(remaining[remaining.length - 1]);
    console.log('   checking end:', remaining[remaining.length - 1], '-> normalized:', normalized, 'is region:', QUEBEC_REGIONS.has(normalized));
    if (QUEBEC_REGIONS.has(normalized)) {
      remaining.pop();
    } else {
      break;
    }
  }
  console.log('   after stripping regions:', remaining);

  const cities = await getCitySet();
  console.log('   citySet size:', cities.size);

  let cityIdx = -1;
  for (let i = remaining.length - 1; i >= 0; i--) {
    const normalized = normalizeCityName(remaining[i]);
    console.log('   checking city at', i, ':', remaining[i], '->', normalized, 'found:', cities.has(normalized));
    if (cities.has(normalized)) {
      cityIdx = i;
      break;
    }
  }

  console.log('   cityIdx:', cityIdx);

  if (cityIdx === -1) {
    return null;
  }

  const streetParts = remaining.slice(0, cityIdx);
  const street = streetParts.length > 0 ? streetParts.join(', ') : null;
  const city = remaining[cityIdx];

  console.log('📝 parseDisplayName result:', { street, city, postalCode });
  return {
    street: street || null,
    city: city || null,
    postalCode: postalCode || null,
  };
}

function getCacheKey(query) {
  const normalized = query.toLowerCase().trim().replace(/[\p{P}]/gu, '').replace(/\s+/g, ' ');
  return `nominatim_${normalized}`;
}

function getCachedResults(query) {
  try {
    const key = getCacheKey(query);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedResults(query, data) {
  try {
    const key = getCacheKey(query);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function clearCache(query) {
  try {
    const key = getCacheKey(query);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export { getCacheKey, getCachedResults, setCachedResults, clearCache, parseDisplayName };

export function useNominatimSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const pendingRequestCountRef = useRef(0);
  const lastRequestTimeRef = useRef(0);
  const abortControllerRef = useRef(null);

  const search = useCallback(async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError(null);
      return [];
    }

    setError(null);

    // Check cache first
    const cached = getCachedResults(trimmed);
    if (cached) {
      return cached;
    }

    // Rate limiting: wait if last request was too recent
    const now = Date.now();
    const elapsed = now - lastRequestTimeRef.current;
    if (elapsed < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - elapsed));
    }

    // Abort any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    pendingRequestCountRef.current += 1;
    // Only set isSearching when transitioning from 0 to 1 active request
    if (pendingRequestCountRef.current === 1) {
      setIsSearching(true);
    }

    try {
      lastRequestTimeRef.current = Date.now();

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=5&countrycodes=ca&bounded=1&viewbox=${QUEBEC_VIEWBOX}`,
        {
          signal: abortControllerRef.current.signal,
          headers: { 'User-Agent': 'RegieEssenceQC/1.0' },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          setError('Trop de requêtes, réessayez plus tard.');
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log('🔍 Nominatim response:', JSON.stringify(data, null, 2));

      const processedResults = await Promise.all(
        data
          .filter(item => item.lat && item.lon)
          .map(async item => {
            const address = item.address || {};
            console.log('📦 item address:', JSON.stringify(address), 'road:', address.road, 'house_number:', address.house_number);
            const number = address.house_number || '';
            const road = address.road || '';
            let street = [number, road].filter(Boolean).join(' ') || null;
            let city = address.city || address.town || address.village || address.suburb || null;
            let postalCode = address.postcode || null;

            if (!street || !city) {
              const parsed = await parseDisplayName(item.display_name);
              if (!parsed) return null;
              if (!street) street = parsed.street;
              if (!city) city = parsed.city;
              if (!street || !city) return null;
              if (!postalCode) postalCode = parsed.postalCode;
            }

            const parts = [];
            if (street) parts.push(street);
            if (city) parts.push(city);
            if (postalCode) parts.push(postalCode);

            const formatted = parts.length > 0
              ? parts.join(', ')
              : item.display_name;

            return {
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              name: formatted,
              display_name: item.display_name,
            };
          })
      );

      const results = processedResults.filter(r => r && r.name);
      console.log('✅ results:', results);

      setCachedResults(trimmed, results);
      return results;
    } catch (err) {
      if (err.name === 'AbortError') return [];
      console.error('❌ Search error:', err, err.message);
      setError('Impossible de rechercher. Vérifiez votre connexion.');
      return [];
    } finally {
      pendingRequestCountRef.current -= 1;
      if (pendingRequestCountRef.current <= 0) {
        setIsSearching(false);
      }
    }
  }, []);

  const clearAllCache = useCallback(() => {
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('nominatim_'));
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }, []);

  return { search, isSearching, error, clearAllCache };
}

export default useNominatimSearch;
