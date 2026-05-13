import { useTheme } from '../../context/ThemeContext';

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

const LIGHT = {
  bg: '#fff',
  text: '#6b7280',
  titleText: '#374151',
  emptyText: '#9ca3af',
  fuelLabel: '#1f2937',
  separator: '#e5e7eb',
  pieBg: '#e5e7eb',
  pieSlice: '#1f2937',
  pieBorder: '#000',
  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
};

const DARK = {
  bg: '#16171d',
  text: '#9ca3af',
  titleText: '#f3f4f6',
  emptyText: '#6b7280',
  fuelLabel: '#f3f4f6',
  separator: '#2e303a',
  pieBg: '#374151',
  pieSlice: '#9ca3af',
  pieBorder: '#1f2937',
  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
};

function PriceLegend({ stations = [], selectedFuelTypes = [] }) {
  const { theme } = useTheme();
  const c = theme === 'dark' ? DARK : LIGHT;

  if (stations.length === 0) {
   return (
    <div className="price-legend">
         <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', marginBottom: '12px', color: c.titleText }}>Prix au litre</div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>Aucune station</div>
      </div>
    );
  }

  const displayTypes = selectedFuelTypes.length > 0
    ? selectedFuelTypes.filter(id => FUEL_TYPES_ORDER.includes(id))
    : FUEL_TYPES_ORDER;

  const sliceDeg = displayTypes.length > 0 ? 360 / displayTypes.length : 0;

  return (
    <div className="price-legend">
        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', marginBottom: '12px', color: c.titleText }}>Prix au litre</div>

       {displayTypes.map((fuelId, index) => {
        const startAngle = index * sliceDeg;
        const sliceEnd = startAngle + sliceDeg;
        const sliceGradient = `conic-gradient(
          ${c.pieBg} 0deg ${startAngle}deg,
          ${c.pieSlice} ${startAngle}deg ${sliceEnd}deg,
          ${c.pieBg} ${sliceEnd}deg 360deg
        )`;

        return (
          <div key={fuelId} className="price-legend-fuel-row" style={{ display: 'flex', alignItems: 'center',justifyContent: 'space-between', margin: '6px 0', gap: '10px' }}>
            <span style={{ color: c.fuelLabel, fontSize: '12px', fontWeight: '500' }}>{FUEL_LABELS[fuelId]}</span>
            <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: '0' }}>
              <div style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '2px solid ' + c.pieBorder, background: sliceGradient }} />
            </div>
          </div>
        );
      })}

      <div style={{ height: '1px', background: c.separator, margin: '10px 0' }} />
      <div style={{ fontSize: '11px', color: c.text }}>
        <div style={{
          height: '10px',
          borderRadius: '5px',
          background: 'linear-gradient(to right, #16a34a 0%, #eab308 25%, #f97316 50%, #ef4444 75%, #dc2626 100%)',
          marginBottom: '4px'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span>Prix le plus bas</span>
          <span>Prix le plus élevé</span>
        </div>
      </div>
    </div>
  );
}

export default PriceLegend;
