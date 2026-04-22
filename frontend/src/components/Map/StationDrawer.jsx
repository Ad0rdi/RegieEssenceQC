import React from 'react';
import { useFilters } from '../../context/FilterContext';
import StationTable from './StationTable';

const StationDrawer = ({ stations, onStationClick, selectedStationId }) => {
  const { drawerOpen, setDrawerOpen, selectedFuelTypes } = useFilters();

  return (
    <div className={`station-drawer ${drawerOpen ? 'expanded' : 'collapsed'}`}>
      <button className="drawer-toggle" onClick={() => setDrawerOpen(!drawerOpen)}>
        {drawerOpen ? '▼ Collapse' : '▲ Expand Stations'}
      </button>
      {drawerOpen && (
        <div className="drawer-content">
          <StationTable stations={stations} onStationClick={onStationClick} selectedStationId={selectedStationId} selectedFuelTypes={selectedFuelTypes} />
        </div>
      )}
    </div>
  );
};

export default StationDrawer;
