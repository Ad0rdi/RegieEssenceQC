import React, { useState, useMemo } from 'react';
import { calculateDistance } from '../../utils/geolocation';

const StationTable = ({ stations, onStationClick, selectedStationId, selectedFuelTypes, centerLocation }) => {
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem('stationTableSort');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { key: 'regular', direction: 'asc' };
      }
    }
    return { key: 'regular', direction: 'asc' };
  });

  const getVal = (s, key) => {
    if (key === 'minPrice') return s.prices?.regular ?? Infinity;
    if (key === 'regular' || key === 'super' || key === 'diesel') return s.prices?.[key] ?? Infinity;
    if (key === 'distance') return s.distance != null ? s.distance : Infinity;
    return (s[key] || '') ?? '';
  };

  const FUEL_COLUMNS = [
    { key: 'regular', label: 'Régulier' },
    { key: 'super', label: 'Super' },
    { key: 'diesel', label: 'Diesel' },
  ];

  const visibleFuelColumns = FUEL_COLUMNS.filter(col =>
    selectedFuelTypes?.includes(col.key)
  );

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newConfig = { key, direction };
    setSortConfig(newConfig);
    localStorage.setItem('stationTableSort', JSON.stringify(newConfig));
  };

  const stationsWithDistance = useMemo(() => {
    if (!centerLocation) {
      return stations.map(s => ({ ...s, distance: null }));
    }
    return stations.map(s => ({
      ...s,
      distance: Math.round(calculateDistance(centerLocation.lat, centerLocation.lng, s.lat, s.lng) * 10) / 10
    }));
  }, [stations, centerLocation]);

  const primaryFuelKey = visibleFuelColumns.length > 0 ? visibleFuelColumns[0].key : 'regular';
  const minPrimaryPrice = Math.min(...stationsWithDistance.map(s => s.prices?.[primaryFuelKey] ?? Infinity));

  const sortedStations = [...stationsWithDistance].sort((a,
    b) => {
    const aVal = getVal(a, sortConfig.key);
    const bVal = getVal(b, sortConfig.key);
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="station-table-container">
      <table className="station-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('brand')} style={{ cursor: 'pointer' }}>Brand</th>
            <th onClick={() => requestSort('address')} style={{ cursor: 'pointer' }}>Address</th>
            <th onClick={() => requestSort('distance')} style={{ cursor: 'pointer' }}>Distance</th>
            {visibleFuelColumns.map(col => (
              <th key={col.key} onClick={() => requestSort(col.key)} style={{ cursor: 'pointer' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStations.map((station) => (
              <tr
                  key={station.id}
                  className={`station-row ${station.prices?.[primaryFuelKey] === minPrimaryPrice ? 'cheapest-row' : ''} ${selectedStationId === station.id ? 'selected-row' : ''}`}
                  onClick={() => onStationClick && onStationClick(station)}
                  style={{ cursor: 'pointer' }}
                >
               <td className="station-table-cell">{station.brand || station.name || 'N/A'}</td>
                  <td className="station-table-cell">{station.address || 'N/A'}</td>
                   <td className="station-table-cell">{station.distance != null ? `${station.distance.toFixed(1)} km` : '—'}</td>
                  {visibleFuelColumns.map(col => (
                    <td key={col.key} className="station-table-cell">
                      {station.prices?.[col.key] != null ? `$${station.prices[col.key].toFixed(3)}` : 'N/A'}
                    </td>
                  ))}
               </tr>
           ))}
         </tbody>
       </table>
     </div>
   );
 };
 
 export default StationTable;
