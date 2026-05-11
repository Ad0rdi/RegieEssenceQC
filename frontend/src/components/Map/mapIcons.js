import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const selectedIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [25, 41],
});

const PRICING_COLORS = {
  low: '#16a34a',
  medium: '#f97316',
  high: '#dc2626',
};

function getStationPrice(prices, fuelType) {
  if (!prices || !fuelType) return null;
  const price = prices[fuelType];
  if (price == null) return null;
  return price;
}

function getPriceLevelIcon(level) {
  if (!level || !(level in PRICING_COLORS)) return null;
  const color = PRICING_COLORS[level];
  return L.divIcon({
    className: 'price-marker',
    html: '<div class="price-marker" style="width:28px;height:28px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex!important;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">$</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function getFuelPieIcon(selectedFuelTypes, levelsMap, stationId) {
  if (!selectedFuelTypes || selectedFuelTypes.length === 0) {
    return L.divIcon({
      className: 'price-marker',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:#888;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex!important;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">$</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  const n = selectedFuelTypes.length;
  const size = 28;
  const cx = 14;
  const cy = 14;
  const PI = Math.PI;

  const svgParts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;">'];

  for (let i = 0; i < n; i++) {
    const fuelType = selectedFuelTypes[i];
    const stationLevels = levelsMap.get(fuelType);
    const level = stationLevels ? stationLevels.get(stationId) : null;
    const color = level ? PRICING_COLORS[level] : '#888';

    if (n === 1) {
      svgParts.push('<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + color + '"/>');
    } else {
      const sliceDeg = 360 / n;
      const startAngle = (i * sliceDeg - 90) * PI / 180;
      const endAngle = ((i + 1) * sliceDeg - 90) * PI / 180;

      const x1 = cx + 14 * Math.cos(startAngle);
      const y1 = cy + 14 * Math.sin(startAngle);
      const x2 = cx + 14 * Math.cos(endAngle);
      const y2 = cy + 14 * Math.sin(endAngle);
      const largeArc = sliceDeg > 180 ? 1 : 0;

      svgParts.push('<path d="M ' + cx + ' ' + cy + ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A 14 14 0 ' + largeArc + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z" fill="' + color + '" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>');
    }
  }

  svgParts.push('</svg>');
  const svg = svgParts.join('');

  return L.divIcon({
    className: 'price-marker fuel-pie-marker',
    html: '<div style="width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + svg + '</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function calculatePriceLevels(stations, fuelType) {
  const priceMap = new Map();

  const validPrices = stations
    .map((station) => ({
      id: station.id,
      price: station.prices ? station.prices[fuelType] : null,
    }))
    .filter((entry) => entry.price != null);

  if (validPrices.length === 0) return priceMap;

  if (validPrices.length === 1) {
    priceMap.set(validPrices[0].id, 'low');
    return priceMap;
  }

  if (validPrices.length === 2) {
    const sorted = [...validPrices].sort((a, b) => a.price - b.price);
    priceMap.set(sorted[0].id, 'low');
    priceMap.set(sorted[1].id, 'high');
    return priceMap;
  }

  const sorted = [...validPrices].sort((a, b) => a.price - b.price);
  const n = sorted.length;
  const third = n / 3;

  for (let i = 0; i < n; i++) {
    if (i < Math.ceil(third)) {
      priceMap.set(sorted[i].id, 'low');
    } else if (i < Math.ceil(third * 2)) {
      priceMap.set(sorted[i].id, 'medium');
    } else {
      priceMap.set(sorted[i].id, 'high');
    }
  }

  return priceMap;
}

export { selectedIcon, PRICING_COLORS, getStationPrice, getPriceLevelIcon, calculatePriceLevels, getFuelPieIcon };

export function calculateAllPriceLevels(stations, selectedFuelTypes) {
  const fuelLevelsMap = new Map();

  selectedFuelTypes.forEach((fuelType) => {
    const levels = new Map();
    const entries = stations
      .map((station) => ({
        id: station.id,
        price: station.prices ? station.prices[fuelType] : null,
      }))
      .filter((entry) => entry.price != null);

    if (entries.length === 0) {
      fuelLevelsMap.set(fuelType, levels);
      return;
    }

    if (entries.length === 1) {
      levels.set(entries[0].id, 'low');
      fuelLevelsMap.set(fuelType, levels);
      return;
    }

    const sorted = [...entries].sort((a, b) => a.price - b.price);

    if (sorted.length === 2) {
      levels.set(sorted[0].id, 'low');
      levels.set(sorted[1].id, 'high');
      fuelLevelsMap.set(fuelType, levels);
      return;
    }

    const n = sorted.length;
    const third = n / 3;

    sorted.forEach((entry, i) => {
      if (i < Math.ceil(third)) {
        levels.set(entry.id, 'low');
      } else if (i < Math.ceil(third * 2)) {
        levels.set(entry.id, 'medium');
      } else {
        levels.set(entry.id, 'high');
      }
    });

    fuelLevelsMap.set(fuelType, levels);
  });

  return fuelLevelsMap;
}
