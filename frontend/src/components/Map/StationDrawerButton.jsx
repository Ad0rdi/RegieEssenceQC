export default function StationDrawerButton({ stationCount, drawerOpen, onToggle }) {
  return (
    <div className="leaflet-station-btn-wrapper">
      <button
        className="leaflet-station-btn"
        onClick={onToggle}
        title="Voir les stations"
        aria-label="Voir les stations"
        aria-expanded={drawerOpen}
      >
        <span aria-hidden="true">📋</span>
        <span>Stations ({stationCount})</span>
      </button>
    </div>
  );
}
