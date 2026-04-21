import React, { useState } from 'react';

const StationTable = ({ stations, onStationClick }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'brand', direction: 'asc' });

  const getVal = (s, key) => {
    if (key === 'minPrice') return s.prices?.regular ?? Infinity;
    return s[key];
  };

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

  return (
    <div className="station-table-container">
      <table className="station-table">
        <thead>
          <tr>
            <th onClick={() => requestSort('brand')} style={{ cursor: 'pointer' }}>Brand</th>
            <th onClick={() => requestSort('company')} style={{ cursor: 'pointer' }}>Company</th>
            <th onClick={() => requestSort('address')} style={{ cursor: 'pointer' }}>Address</th>
            <th onClick={() => requestSort('minPrice')} style={{ cursor: 'pointer' }}>Min Price</th>
          </tr>
        </thead>
        <tbody>
          {sortedStations.map((station) => (
               <tr 
                 key={station.id} 
                 onClick={() => onStationClick && onStationClick(station)} 
                 style={{ cursor: 'pointer' }}
               >
                 <td className="station-table-cell">{station.brand || station.name || 'N/A'}</td>
                 <td className="station-table-cell">{station.company || 'N/A'}</td>
                 <td className="station-table-cell">{station.address || 'N/A'}</td>
                 <td className="station-table-cell">
                   {station.prices?.regular ? `$${station.prices.regular.toFixed(3)}` : 'N/A'}
                 </td>
               </tr>
           ))}
         </tbody>
       </table>
     </div>
   );
 };
 
 export default StationTable;
