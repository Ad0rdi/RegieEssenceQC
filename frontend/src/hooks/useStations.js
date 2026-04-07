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
          .map(feature => ({
            id: feature.properties.id || feature.properties.name,
            name: feature.properties.name,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            prices: {
              regular: feature.properties.regular,
              super: feature.properties.super,
              diesel: feature.properties.diesel
            },
            address: feature.properties.address
          }))
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
