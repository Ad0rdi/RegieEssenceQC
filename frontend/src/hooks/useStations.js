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

        // Transform GeoJSON features to a simpler station model
        const transformedStations = data.features
          .filter(feature => 
            feature.geometry?.coordinates?.length === 2 &&
            feature.properties
          )
            .map(feature => {
              const prices = {};
              if (feature.properties.Prices && Array.isArray(feature.properties.Prices)) {
                feature.properties.Prices.forEach(p => {
                  const typeMap = {
                    'Régulier': 'regular',
                    'Super': 'super',
                    'Diesel': 'diesel'
                  };
                  const mappedType = typeMap[p.GasType];
                   if (mappedType && p.Price && typeof p.Price === 'string' && p.IsAvailable) {
                      const priceValue = parseFloat(p.Price.replace('¢', '')) / 100;
                      prices[mappedType] = priceValue;
                    }
                });
              }

              return {
                id: feature.properties.id || feature.properties.name,
                name: feature.properties.name,
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                prices: prices,
                address: feature.properties.address
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
  }, [selectedFuelTypes]);

  return { stations, loading, error };
};
