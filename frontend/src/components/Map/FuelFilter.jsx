import React from 'react';
import { useFilters } from '../../context/FilterContext';

const FuelFilter = () => {
  const { selectedFuelTypes, toggleFuelType } = useFilters();

  const fuelTypes = [
    { id: 'regular', label: 'Regular' },
    { id: 'super', label: 'Super' },
    { id: 'diesel', label: 'Diesel' }
  ];

  const selectedTypes = selectedFuelTypes.filter(t =>
    fuelTypes.some(ft => ft.id === t)
  );

  return (
    <div className="fuel-filter-wrapper">
      <div className="fuel-filter-container">
        {fuelTypes.map((type) => (
          <button
            key={type.id}
            className={`fuel-type-btn ${selectedTypes.includes(type.id) ? 'active' : ''}`}
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
