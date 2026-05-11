import L from 'leaflet';
import { PRICING_COLORS } from './mapIcons';

function buildClusterHTML(count, svg) {
  return '<div class="cluster-marker-inner">' + svg + '</div><div class="cluster-badge">' + count + '</div>';
}

function getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap) {
  const count = (stations && stations.length > 0) ? String(stations.length) : '0';
  const n = selectedFuelTypes ? selectedFuelTypes.length : 0;

  if (n === 0) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="display:block;"><rect x="4" y="4" width="24" height="24" rx="4" ry="4" fill="#888"/></svg>';
    return L.divIcon({
      className: 'cluster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: buildClusterHTML(count, svg),
    });
  }

  const size = 32;
  const cx = 16;
  const cy = 16;
  const PI = Math.PI;

  const svgParts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;">',
    '<defs><clipPath id="c-clip"><rect x="4" y="4" width="24" height="24" rx="4" ry="4"/></clipPath></defs>',
    '<g clip-path="url(#c-clip)">'
  ];

  for (let i = 0; i < n; i++) {
    const fuelType = selectedFuelTypes[i];
    let cheapestStation = null;
    let cheapestPrice = Infinity;

    for (let j = 0; j < stations.length; j++) {
      const station = stations[j];
      if (!station || !station.prices) continue;
      const price = station.prices[fuelType];
      if (price == null) continue;
      if (price < cheapestPrice) {
        cheapestPrice = price;
        cheapestStation = station;
      }
    }

    let color = '#888';
    if (cheapestStation) {
      const stationLevels = fuelLevelsMap ? fuelLevelsMap.get(fuelType) : null;
      const level = stationLevels ? stationLevels.get(cheapestStation.id) : null;
      if (level && PRICING_COLORS[level]) {
        color = PRICING_COLORS[level];
      }
    }

    if (n === 1) {
      svgParts.push('<rect x="4" y="4" width="24" height="24" rx="4" ry="4" fill="' + color + '"/>');
    } else {
      const sliceDeg = 360 / n;
      const startAngle = (i * sliceDeg - 90) * PI / 180;
      const endAngle = ((i + 1) * sliceDeg - 90) * PI / 180;

      const x1 = cx + 16 * Math.cos(startAngle);
      const y1 = cy + 16 * Math.sin(startAngle);
      const x2 = cx + 16 * Math.cos(endAngle);
      const y2 = cy + 16 * Math.sin(endAngle);
      const largeArc = sliceDeg > 180 ? 1 : 0;

      svgParts.push('<path d="M ' + cx + ' ' + cy + ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A 16 16 0 ' + largeArc + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z" fill="' + color + '" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>');
    }
  }

  svgParts.push('</g></svg>');
  const svg = svgParts.join('');

  return L.divIcon({
    className: 'cluster-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: buildClusterHTML(count, svg),
  });
}

export { getClusterIcon };
