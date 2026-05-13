import L from 'leaflet';
import { PRICING_COLORS, interpolateColor } from './mapIcons';

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

function getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap, globalPriceRange) {
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

      // Build local levels among stations in this cluster for picking cheapest
      const clusterPrices = [];
      for (let j = 0; j < stations.length; j++) {
        const station = stations[j];
        if (!station || !station.prices) continue;
        const price = station.prices[fuelType];
        if (price != null) clusterPrices.push({ station, price });
      }
      clusterPrices.sort((a, b) => a.price - b.price);

      // Color based on cheapest price in cluster mapped to global gradient
      let color = '#888';
      if (clusterPrices.length > 0 && globalPriceRange) {
        const range = globalPriceRange[fuelType];
        if (range) {
          color = interpolateColor(range.min, range.max, clusterPrices[0].price);
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
