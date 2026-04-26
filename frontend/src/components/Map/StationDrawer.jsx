import React from 'react';
import { useFilters } from '../../context/FilterContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import StationTable from './StationTable';

const StationDrawer = ({ stations, onStationClick, selectedStationId, centerLocation }) => {
  const { drawerOpen, setDrawerOpen, selectedFuelTypes } = useFilters();
  const isMobile = useIsMobile();

  const handleStationClick = (station) => {
    onStationClick?.(station);
    if (isMobile && drawerOpen) {
      setDrawerOpen(false);
    }
  };

  return (
    <div className={`station-drawer ${drawerOpen ? 'expanded' : 'collapsed'}`}>
      {isMobile && drawerOpen && (
        <div className="drawer-header-mobile">
          <span className="drawer-header-title">Stations</span>
          <button className="drawer-toggle" onClick={() => setDrawerOpen(false)}>
            ✕
          </button>
        </div>
      )}
      {!isMobile && (
        <button className="drawer-toggle" onClick={() => setDrawerOpen(!drawerOpen)}>
          {drawerOpen ? '▼ Collapse' : '▲ Expand Stations'}
        </button>
      )}
      {drawerOpen && (
        <div className="drawer-content">
          <StationTable stations={stations} onStationClick={handleStationClick} selectedStationId={selectedStationId} selectedFuelTypes={selectedFuelTypes} centerLocation={centerLocation} />
        </div>
      )}
    </div>
  );
};

export default StationDrawer;
