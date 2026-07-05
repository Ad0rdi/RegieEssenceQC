import { useState, useEffect, useRef } from 'react';
import { fetchStations, useCachedData as getCachedData, transformCachedStations } from '../services/dataService';
import { setCache } from '../utils/storage';


function useStations(selectedFuelTypes = ['regular', 'super', 'diesel']) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const prevFuelTypesRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    const prevFuelTypes = prevFuelTypesRef.current;
    const currentFuelTypes = JSON.stringify(selectedFuelTypes);

    if (prevFuelTypes !== null && prevFuelTypes === currentFuelTypes && hasLoadedRef.current) {
      return;
    }
    prevFuelTypesRef.current = currentFuelTypes;

    const loadStations = async () => {
      try {
        const cacheResult = await getCachedData(selectedFuelTypes);

        if (cacheResult && isMountedRef.current) {
          setStations(cacheResult.stations);
          setGeneratedAt(cacheResult.generatedAt);
          setFromCache(true);
          setLoading(false);
          hasLoadedRef.current = true;
        }

        if (!controller.signal.aborted) {
          const data = await fetchStations();

          if (!controller.signal.aborted) {
            if (!data || !Array.isArray(data.features)) {
              // eslint-disable-next-line no-throw-local-return
              throw new Error('Invalid GeoJSON format: missing features array');
            }

            const transformedStations = transformCachedStations(data, selectedFuelTypes);

            setStations(transformedStations);
            setGeneratedAt(data?.metadata?.generated_at ?? null);
            setFromCache(false);
            setError(null);
            hasLoadedRef.current = true;

            if (isMountedRef.current) {
              try {
                await setCache(data);
              } catch {
                // silently ignore cache errors
              }
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError' && isMountedRef.current) {
          setError(err.message || 'Erreur de chargement des stations');
        }
      } finally {
        if (isMountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadStations();

    return () => {
      controller.abort();
      isMountedRef.current = false;
    };
  }, [selectedFuelTypes]);

  return { stations, loading, error, generatedAt, fromCache };
}

export { useStations };
