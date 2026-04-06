import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [selectedFuelTypes, setSelectedFuelTypes] = useState(['regular', 'super', 'diesel']);
  const [stationRadius, setStationRadius] = useState(5); // km

  const toggleFuelType = (type) => {
    setSelectedFuelTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <FilterContext.Provider value={{ 
      selectedFuelTypes, 
      toggleFuelType, 
      stationRadius, 
      setStationRadius 
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => useContext(FilterContext);
