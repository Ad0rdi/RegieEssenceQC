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

function getFuelPieIcon(selectedFuelTypes, stationPrices, globalPriceRange) {
  if (!selectedFuelTypes || selectedFuelTypes.length === 0) {
    return L.divIcon({
      className: 'price-marker',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:#888;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex!important;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">$</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  const n = selectedFuelTypes.length;

  // Single fuel type: simple circle
  if (n === 1) {
    const fuelType = selectedFuelTypes[0];
    const price = stationPrices && stationPrices[fuelType] != null ? stationPrices[fuelType] : null;
    let color = '#888';
    if (price != null && globalPriceRange) {
      const range = globalPriceRange[fuelType];
      if (range) {
        color = interpolateColor(range.min, range.max, price);
      }
    }
    return L.divIcon({
      className: 'price-marker fuel-pie-marker',
      html: '<div style="width:28px;height:28px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  // Multiple fuel types: conic-gradient
  const gradients = [];
  const sliceDeg = 360 / n;

  for (let i = 0; i < n; i++) {
    const fuelType = selectedFuelTypes[i];
    const price = stationPrices && stationPrices[fuelType] != null ? stationPrices[fuelType] : null;
    let color = '#888';
    if (price != null && globalPriceRange) {
      const range = globalPriceRange[fuelType];
      if (range) {
        color = interpolateColor(range.min, range.max, price);
      }
    }
    const start = i * sliceDeg;
    const end = (i + 1) * sliceDeg;
    gradients.push(color + ' ' + start.toFixed(1) + 'deg ' + end.toFixed(1) + 'deg');
  }

  const gradient = 'conic-gradient(' + gradients.join(', ') + ')';

  return L.divIcon({
    className: 'price-marker fuel-pie-marker',
    html: '<div style="width:28px;height:28px;border-radius:50%;background:' + gradient + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
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

function interpolateColor(minPrice, maxPrice, price) {
  if (maxPrice == null || minPrice == null || maxPrice === minPrice) return '#16a34a';

  const logMin = Math.log(minPrice);
  const logMax = Math.log(maxPrice);
  const ratio = (Math.log(price) - logMin) / (logMax - logMin);

  const stops = [
    { pos: 0, r: 22, g: 163, b: 74 },   // Green
    { pos: 0.25, r: 234, g: 179, b: 8 }, // Yellow
    { pos: 0.5, r: 249, g: 115, b: 22 }, // Orange
    { pos: 0.75, r: 239, g: 68, b: 68 }, // Red
    { pos: 1, r: 220, g: 38, b: 38 },    // Dark Red
  ];

  let lower = stops[0], upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (ratio >= stops[i].pos && ratio <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.pos - lower.pos;
  const t = range > 0 ? (ratio - lower.pos) / range : 0;
  const r = Math.round(lower.r + (upper.r - lower.r) * t);
  const g = Math.round(lower.g + (upper.g - lower.g) * t);
  const b = Math.round(lower.b + (upper.b - lower.b) * t);

  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export { selectedIcon, PRICING_COLORS, getStationPrice, getPriceLevelIcon, calculatePriceLevels, getFuelPieIcon, interpolateColor };

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
