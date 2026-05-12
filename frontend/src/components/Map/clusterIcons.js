import L from 'leaflet';
import { PRICING_COLORS } from './mapIcons';

function buildClusterHTML(count, svg) {
  return '<div class="cluster-marker-inner">' + svg + '<div class="cluster-badge">' + count + '</div></div>';
}

const LEVEL_ORDER = { low: 0, medium: 1, high: 2 };

function getDominantColor(stations, selectedFuelTypes, fuelLevelsMap) {
  let bestColor = '#d4d4d8';
  let bestCount = 0;
  selectedFuelTypes.forEach((fuelType) => {
    const counts = { low: 0, medium: 0, high: 0 };
    for (let j = 0; j < stations.length; j++) {
      const station = stations[j];
      if (!station || !station.prices) continue;
      const price = station.prices[fuelType];
      if (price == null) continue;
      const stationLevels = fuelLevelsMap ? fuelLevelsMap.get(fuelType) : null;
      const level = stationLevels ? stationLevels.get(station.id) : null;
      if (level) counts[level]++;
    }
    for (const [level, cnt] of Object.entries(counts)) {
      if (cnt > bestCount) {
        bestCount = cnt;
        bestColor = PRICING_COLORS[level] || '#d4d4d8';
      }
    }
  });
  return bestColor;
}

function calculateLocalPriceLevels(stations, fuelType) {
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

  const sorted = [...validPrices].sort((a, b) => a.price - b.price);

  if (sorted.length === 2) {
    priceMap.set(sorted[0].id, 'low');
    priceMap.set(sorted[1].id, 'high');
    return priceMap;
  }

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

function getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap) {
  const count = (stations && stations.length > 0) ? String(stations.length) : '0';
  const n = selectedFuelTypes ? selectedFuelTypes.length : 0;

  const bgColor = getDominantColor(stations, selectedFuelTypes, fuelLevelsMap);
  const cx = 16;
  const cy = 16;
  const PI = Math.PI;

  const svgParts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="display:block;">'
  ];

  if (n === 0) {
    svgParts.push('<rect x="0" y="0" width="32" height="32" rx="4" ry="4" fill="#888"/>');
  } else if (n === 1) {
    svgParts.push('<rect x="0" y="0" width="32" height="32" rx="4" ry="4" fill="' + bgColor + '"/>');
  } else {
    svgParts.push('<rect x="0" y="0" width="32" height="32" rx="4" ry="4" fill="' + bgColor + '"/>');
    const clipId = 'c-clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    svgParts.push('<defs><clipPath id="' + clipId + '"><rect x="0" y="0" width="32" height="32" rx="4" ry="4"/></clipPath></defs>');
    svgParts.push('<g clip-path="url(#' + clipId + ')">');
    const sliceDeg = 360 / n;

    for (let i = 0; i < n; i++) {
      const fuelType = selectedFuelTypes[i];
      // Compute price levels LOCAL to this cluster so the cheapest station in the cluster is always "low"
      const localLevels = calculateLocalPriceLevels(stations, fuelType);

      let bestStation = null;
      let bestPrice = Infinity;
      let bestLevelOrder = 3;

      for (let j = 0; j < stations.length; j++) {
        const station = stations[j];
        if (!station || !station.prices) continue;
        const price = station.prices[fuelType];
        if (price == null) continue;
        const level = localLevels.get(station.id);
        const levelOrder = level ? (LEVEL_ORDER[level] || 3) : 3;

        // Pick cheapest price; on tie, pick station with best (lowest) level
        if (price < bestPrice || (price === bestPrice && levelOrder < bestLevelOrder)) {
          bestPrice = price;
          bestLevelOrder = levelOrder;
          bestStation = station;
        }
      }

      let color = '#888';
      if (bestStation) {
        const level = localLevels.get(bestStation.id);
        if (level && PRICING_COLORS[level]) {
          color = PRICING_COLORS[level];
        }
      }

      const startAngleRad = (i * sliceDeg - 90) * PI / 180;
      const endAngleRad = ((i + 1) * sliceDeg - 90) * PI / 180;

      const path = 'M ' + cx + ' ' + cy +
        ' L ' + (cx + 200 * Math.cos(startAngleRad)).toFixed(2) + ' ' + (cy + 200 * Math.sin(startAngleRad)).toFixed(2) +
        ' L ' + (cx + 200 * Math.cos(endAngleRad)).toFixed(2) + ' ' + (cy + 200 * Math.sin(endAngleRad)).toFixed(2) +
        ' Z';
      svgParts.push('<path d="' + path + '" fill="' + color + '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>');
    }

    svgParts.push('</g>');
  }

  svgParts.push('</svg>');
  var svg = svgParts.join('');

  return L.divIcon({
    className: 'cluster-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: buildClusterHTML(count, svg),
  });
}

export { getClusterIcon };
