// src/utils/nominatimSearch.js

import { useCallback, useRef, useState } from 'react';

const QUEBEC_VIEWBOX = '-74.5,44.5,-57.5,52.5'; // west,south,east,north (Quebec province bounds)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const RATE_LIMIT_DELAY = 1000; // 1 request per second (Nominatim requirement)

function getCacheKey(query) {
  return `nominatim_${query.toLowerCase().trim()}`;
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

export { getCacheKey, getCachedResults, setCachedResults, clearCache };

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

      const results = data
        .filter(item => item.lat && item.lon)
        .map(item => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          name: item.display_name,
          display_name: item.display_name,
        }));

      setCachedResults(trimmed, results);
      return results;
    } catch (err) {
      if (err.name === 'AbortError') return [];
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
