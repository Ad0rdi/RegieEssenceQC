const PRICING_COLORS = {
  low: '#16a34a',
  medium: '#f97316',
  high: '#dc2626',
};

const LEGEND_ITEMS = [
  { color: PRICING_COLORS.low, label: 'Bas prix' },
  { color: PRICING_COLORS.medium, label: 'Prix moyen' },
  { color: PRICING_COLORS.high, label: 'Haut prix' },
];

function PriceLegend() {
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    minWidth: '170px',
  };

  const titleStyle = {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: '11px',
    color: '#374151',
    letterSpacing: '0.5px',
    marginBottom: '10px',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '4px 0',
  };

  const dotStyle = (color) => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: color,
    border: '2px solid #fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    flexShrink: 0,
  });

  const labelStyle = {
    color: '#1f2937',
    fontSize: '12px',
    marginLeft: '8px',
  };

  const separatorStyle = {
    height: '1px',
    background: '#e5e7eb',
    margin: '10px 0',
  };

  const subtitleStyle = {
    color: '#6b7280',
    fontSize: '11px',
    marginTop: '6px',
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Prix au litre</div>

      {LEGEND_ITEMS.map((item, index) => (
        <div key={index} style={rowStyle}>
          <div style={dotStyle(item.color)} />
          <span style={labelStyle}>{item.label}</span>
        </div>
      ))}

      <div style={separatorStyle} />
      <div style={subtitleStyle}>Basé sur le carburant sélectionné</div>
    </div>
  );
}

export default PriceLegend;
