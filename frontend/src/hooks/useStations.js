import { useState, useEffect } from 'react';
import { fetchStations } from '../services/dataService';

export const useStations = (selectedFuelTypes = ['regular', 'super', 'diesel']) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        const data = await fetchStations();

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
          .map(feature => {
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
              id: props.id || props.name,
              name: props.name,
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0],
              prices: prices,
              address: props.address
            };
          })
          .filter(station => 
            selectedFuelTypes.some(type => 
              station.prices?.[type] !== undefined && station.prices?.[type] !== null
            )
          );

        setStations(transformedStations);
        setError(null);
      } catch (err) {
        console.error('Error loading stations:', err);
        setError(err.message);
        setStations([]);
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, [JSON.stringify(selectedFuelTypes)]);

  return { stations, loading, error };
};
