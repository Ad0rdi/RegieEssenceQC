import React from 'react';
import { useFilters } from '../../context/FilterContext';

const PRICE_LEVEL_COLORS = {
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#dc2626',
};

const FUEL_TYPE_COLORS = {
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

  const selectedTypes = selectedFuelTypes.filter(t =>
    fuelTypes.some(ft => ft.id === t)
  );

  // Build conic gradient for legend pie
  const legendGradient = selectedTypes.length > 0
    ? selectedTypes.map((type, i) => {
        const color = FUEL_TYPE_COLORS[type] || '#888';
        const start = (i / selectedTypes.length) * 100;
        const end = ((i + 1) / selectedTypes.length) * 100;
        return `${color} ${start}% ${end}%`;
      }).join(', ')
    : 'conic-gradient(#888 0% 100%)';

  const sliceAngle = selectedTypes.length > 0 ? 360 / selectedTypes.length : 0;

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

      {selectedTypes.length > 0 && (
        <div className="fuel-type-legend">
          <div className="legend-pie-wrapper">
            <div
              className="legend-pie"
              style={{ background: `conic-gradient(${legendGradient})` }}
            >
              {selectedTypes.map((type, i) => {
                const angle = (i * sliceAngle) + (sliceAngle / 2);
                const rad = ((angle - 90) * Math.PI) / 180;
                const radius = 32;
                const x = 36 + Math.cos(rad) * radius;
                const y = 36 + Math.sin(rad) * radius;
                return (
                  <span
                    key={type}
                    className="pie-label"
                    style={{ left: `${x}px`, top: `${y}px` }}
                  >
                    {FUEL_LABELS[type]}
                  </span>
                );
              })}
            </div>
            <div className="legend-price-key">
              {Object.entries(PRICE_LEVEL_COLORS).map(([level, color]) => (
                <span key={level} className="price-key-item">
                  <span className="price-key-dot" style={{ backgroundColor: color }} />
                  <span>{level === 'low' ? 'Bas' : level === 'medium' ? 'Moyen' : 'Haut'}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelFilter;
