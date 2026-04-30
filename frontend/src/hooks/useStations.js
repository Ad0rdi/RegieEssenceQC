import { useState, useEffect, useRef } from 'react';
import { fetchStations as fetchAndProcessStations } from '../services/dataService';

function useStations(selectedFuelTypes = ['regular', 'super', 'diesel']) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const prevFuelTypesRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const prevFuelTypes = prevFuelTypesRef.current;
    const currentFuelTypes = JSON.stringify(selectedFuelTypes);

    if (prevFuelTypes !== null && prevFuelTypes === currentFuelTypes) {
      return;
    }
    prevFuelTypesRef.current = currentFuelTypes;

    const loadStations = async () => {
      try {
        setLoading(true);
        const data = await fetchAndProcessStations();

        if (!data || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON format: missing features array');
        }

        const typeMap = {
          'régulier': 'regular',
          'super': 'super',
          'diesel': 'diesel',
          'Régulier': 'regular',
          'Super': 'super',
          'Diesel': 'diesel',
          'regular': 'regular'
        };

        const transformedStations = data.features
          .filter(feature =>
            feature.geometry?.coordinates?.length === 2 &&
            feature.properties
          )
          .map((feature, index) => {
            const prices = {};
            const props = feature.properties;

            // Handle Prices array format
            if (Array.isArray(props.Prices)) {
              props.Prices.forEach(p => {
                const mappedType = typeMap[p.GasType];
                if (mappedType && p.Price && typeof p.Price === 'string' && p.IsAvailable) {
                  const priceValue = parseFloat(p.Price.replace('¢', '')) / 100;
                  prices[mappedType] = priceValue;
                }
              });
            }
            // Handle prices object format
            else if (props.prices && typeof props.prices === 'object') {
              for (const [key, value] of Object.entries(props.prices)) {
                const mappedType = typeMap[key];
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
              prices: prices,
              address: props.Address || props.address
            };
          })
          .filter(station =>
            selectedFuelTypes.some(type =>
              station.prices?.[type] !== undefined && station.prices?.[type] !== null
            )
          );

        setStations(transformedStations);
        setGeneratedAt(data?.metadata?.generated_at ?? null);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Erreur de chargement des stations');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadStations();

    return () => {
      controller.abort();
    };
  }, [JSON.stringify(selectedFuelTypes)]);

  return { stations, loading, error, generatedAt };
}

export { useStations };
