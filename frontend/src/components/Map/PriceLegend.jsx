const FUEL_TYPES_ORDER = ['regular', 'super', 'diesel'];

const FUEL_LABELS = {
  regular: 'Régulier',
  super: 'Super',
  diesel: 'Diesel',
};

const PRICE_LEVEL_COLORS = {
  low: '#16a34a',
  medium: '#f97316',
  high: '#dc2626',
};

function PriceLegend({ stations = [], selectedFuelTypes = [] }) {
  if (stations.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>Prix au litre</div>
        <div style={emptyStyle}>Aucune station</div>
      </div>
    );
  }

  const displayTypes = selectedFuelTypes.length > 0
    ? selectedFuelTypes.filter(id => FUEL_TYPES_ORDER.includes(id))
    : FUEL_TYPES_ORDER;

  const sliceDeg = displayTypes.length > 0 ? 360 / displayTypes.length : 0;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Prix au litre</div>

      {displayTypes.map((fuelId, index) => {
        const startAngle = index * sliceDeg;
        const sliceEnd = startAngle + sliceDeg;

        const gradient = `conic-gradient(
          #e5e7eb 0deg ${startAngle}deg,
          #1f2937 ${startAngle}deg ${sliceEnd}deg,
          #e5e7eb ${sliceEnd}deg 360deg
        )`;

        return (
          <div key={fuelId} style={rowStyle}>
            <span style={fuelLabelStyle}>{FUEL_LABELS[fuelId]}</span>
            <div style={pieWrapperStyle}>
              <div style={{ ...pieStyle, background: gradient }} />
            </div>
          </div>
        );
      })}

      <div style={separatorStyle} />
      <div style={keyStyle}>
        <span style={keyItemStyle}><span style={{ ...keyDotStyle, background: PRICE_LEVEL_COLORS.low }} />Bas</span>
        <span style={keyItemStyle}><span style={{ ...keyDotStyle, background: PRICE_LEVEL_COLORS.medium }} />Moyen</span>
        <span style={keyItemStyle}><span style={{ ...keyDotStyle, background: PRICE_LEVEL_COLORS.high }} />Haut</span>
      </div>
    </div>
  );
}

const containerStyle = {
  position: 'absolute',
  top: '16px',
  left: '16px',
  zIndex: 1000,
  background: '#fff',
  padding: '12px 16px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  fontSize: '13px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  minWidth: '200px',
};

const titleStyle = {
  fontWeight: 'bold',
  textTransform: 'uppercase',
  fontSize: '11px',
  color: '#374151',
  letterSpacing: '0.5px',
  marginBottom: '12px',
};

const emptyStyle = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center',
  padding: '20px 0',
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  margin: '6px 0',
  gap: '10px',
};

const fuelLabelStyle = {
  color: '#1f2937',
  fontSize: '12px',
  fontWeight: '500',
  minWidth: '55px',
};

const pieWrapperStyle = {
  position: 'relative',
  width: '32px',
  height: '32px',
  flexShrink: '0',
};

const pieStyle = {
  position: 'absolute',
  inset: '0',
  borderRadius: '50%',
  border: '2px solid #000',
};

const separatorStyle = {
  height: '1px',
  background: '#e5e7eb',
  margin: '10px 0',
};

const keyStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '11px',
  color: '#6b7280',
};

const keyItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '3px',
};

const keyDotStyle = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: '0',
};

export default PriceLegend;
