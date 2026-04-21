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
    html: '<div class="price-marker" style="width:28px;height:28px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">$</div>',
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

export { selectedIcon, PRICING_COLORS, getStationPrice, getPriceLevelIcon, calculatePriceLevels };
