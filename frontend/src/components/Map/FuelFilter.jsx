import React from 'react';
import { useFilters } from '../../context/FilterContext';

const FuelFilter = () => {
  const { selectedFuelTypes, toggleFuelType } = useFilters();
  
  const fuelTypes = [
    { id: 'regular', label: 'Regular' },
    { id: 'super', label: 'Super' },
    { id: 'diesel', label: 'Diesel' }
  ];

  return (
    <div className="fuel-filter-container">
      {fuelTypes.map((type) => (
        <button
          key={type.id}
          className={`fuel-type-btn ${selectedFuelTypes.includes(type.id) ? 'active' : ''}`}
          onClick={() => toggleFuelType(type.id)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};

export default FuelFilter;
