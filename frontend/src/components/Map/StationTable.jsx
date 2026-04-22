import React, { useState } from 'react';

const StationTable = ({ stations, onStationClick, selectedStationId, selectedFuelTypes }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'regular', direction: 'asc' });

  const getVal = (s, key) => {
    if (key === 'minPrice') return s.prices?.regular ?? Infinity;
    if (key === 'regular' || key === 'super' || key === 'diesel') return s.prices?.[key] ?? Infinity;
    return (s[key] || '') ?? '';
  };

  const minRegularPrice = Math.min(...stations.map(s => s.prices?.regular ?? Infinity));

  const sortedStations = [...stations].sort((a,
    b) => {
    const aVal = getVal(a, sortConfig.key);
    const bVal = getVal(b, sortConfig.key);
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const FUEL_COLUMNS = [
    { key: 'regular', label: 'Régulier' },
    { key: 'super', label: 'Super' },
    { key: 'diesel', label: 'Diesel' },
  ];

  const visibleFuelColumns = FUEL_COLUMNS.filter(col =>
    selectedFuelTypes?.includes(col.key)
  );

  return (
    <div className="station-table-container">
      <table className="station-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('brand')} style={{ cursor: 'pointer' }}>Brand</th>
            <th onClick={() => requestSort('address')} style={{ cursor: 'pointer' }}>Address</th>
            {visibleFuelColumns.map(col => (
              <th key={col.key} onClick={() => requestSort(col.key)} style={{ cursor: 'pointer' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStations.map((station) => (
              <tr
                  key={station.id}
                  className={`station-row ${station.prices?.regular === minRegularPrice ? 'cheapest-row' : ''} ${selectedStationId === station.id ? 'selected-row' : ''}`}
                  onClick={() => onStationClick && onStationClick(station)}
                  style={{ cursor: 'pointer' }}
                >
               <td className="station-table-cell">{station.brand || station.name || 'N/A'}</td>
                  <td className="station-table-cell">{station.address || 'N/A'}</td>
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
