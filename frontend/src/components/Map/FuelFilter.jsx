import React from 'react';
import { useFilters } from '../../context/FilterContext';

const FuelFilter = () => {
  const { selectedFuelTypes, toggleFuelType } = useFilters();

  const fuelTypes = [
    { id: 'regular', label: 'Régulier' },
    { id: 'super', label: 'Super' },
    { id: 'diesel', label: 'Diesel' }
  ];

  return (
    <div className="fuel-filter-wrapper">
      <div className="fuel-filter-pills">
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
    </div>
  );
};

export default FuelFilter;
