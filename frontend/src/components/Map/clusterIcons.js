import L from 'leaflet';
import { interpolateColor } from './mapIcons';

function buildClusterHTML(count, svg) {
  return '<div class="cluster-marker-inner">' + svg + '<div class="cluster-badge">' + count + '</div></div>';
}

function getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap, globalPriceRange) {
  const count = (stations && stations.length > 0) ? String(stations.length) : '0';
  const n = selectedFuelTypes ? selectedFuelTypes.length : 0;
  const cx = 16;
  const cy = 16;
  const PI = Math.PI;

  const svgParts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" overflow="hidden">'
  ];

  if (n === 0) {
    svgParts.push('<rect x="0" y="0" width="32" height="32" rx="4" ry="4" fill="#888"/>');
  } else {
    const sliceDeg = 360 / n;
    const startAngle = -90;

    for (let i = 0; i < n; i++) {
      const fuelType = selectedFuelTypes[i];

      const clusterPrices = [];
      for (let j = 0; j < stations.length; j++) {
        const station = stations[j];
        if (!station || !station.prices) continue;
        const price = station.prices[fuelType];
        if (price != null) clusterPrices.push({ station, price });
      }
      clusterPrices.sort((a, b) => a.price - b.price);

      let color = '#888';
      if (clusterPrices.length > 0 && globalPriceRange) {
        const range = globalPriceRange[fuelType];
        if (range) {
          color = interpolateColor(range.min, range.max, clusterPrices[0].price);
        }
      }

      if (n === 1) {
        svgParts.push('<rect x="0" y="0" width="32" height="32" rx="4" ry="4" fill="' + color + '"/>');
      } else if (n === 2) {
        if (i === 0) {
          svgParts.push('<path d="M 0 0 L 16 0 L 16 32 L 0 32 Z" fill="' + color + '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>');
        } else {
          svgParts.push('<path d="M 16 0 L 32 0 L 32 32 L 16 32 Z" fill="' + color + '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>');
        }
      } else {
        const a0 = (startAngle + i * sliceDeg) * PI / 180;
        const a1 = (startAngle + (i + 1) * sliceDeg) * PI / 180;

        const path = 'M ' + cx + ' ' + cy +
          ' L ' + (cx + 200 * Math.cos(a0)).toFixed(2) + ' ' + (cy + 200 * Math.sin(a0)).toFixed(2) +
          ' L ' + (cx + 200 * Math.cos(a1)).toFixed(2) + ' ' + (cy + 200 * Math.sin(a1)).toFixed(2) +
          ' Z';
        svgParts.push('<path d="' + path + '" fill="' + color + '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>');
      }
    }
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
