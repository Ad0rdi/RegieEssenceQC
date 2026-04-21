import React from 'react';
import { useFilters } from '../../context/FilterContext';

const FUEL_COLORS = {
  regular: '#16a34a',
  super: '#f97316',
  diesel: '#dc2626',
};

const FUEL_LABELS = {
  regular: 'Regular',
  super: 'Super',
  diesel: 'Diesel',
};

const FuelFilter = () => {
  const { selectedFuelTypes, toggleFuelType } = useFilters();

  const fuelTypes = [
    { id: 'regular', label: 'Regular' },
    { id: 'super', label: 'Super' },
    { id: 'diesel', label: 'Diesel' }
  ];

  // Build legend gradient string
  const legendGradient = selectedFuelTypes
    .map((type, i) => {
      const color = FUEL_COLORS[type] || '#888';
      const start = (i / selectedFuelTypes.length) * 100;
      const end = ((i + 1) / selectedFuelTypes.length) * 100;
      return `${color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="fuel-filter-wrapper">
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
      <div className="fuel-type-legend">
        <div
          className="legend-pie"
          style={{
            background: legendGradient || 'conic-gradient(#888 0% 100%)',
          }}
        />
        <div className="legend-labels">
          {selectedFuelTypes.map((type) => (
            <span key={type} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: FUEL_COLORS[type] }} />
              {FUEL_LABELS[type]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FuelFilter;
