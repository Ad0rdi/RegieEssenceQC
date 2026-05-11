import L from 'leaflet';
import { PRICING_COLORS } from './mapIcons';

/**
 * Builds the HTML string for a cluster marker with count badge.
 *
 * @param {string} count - Number of stations in the cluster
 * @param {string} svg - SVG pie chart markup
 * @returns {string} HTML string for the cluster marker
 */
function buildClusterHTML(count, svg) {
  return '<div class="cluster-marker-inner">' + svg + '</div><div class="cluster-badge">' + count + '</div>';
}

/**
 * Generates a custom cluster marker icon for leaflet.markercluster.
 *
 * @param {Object[]} stations - Array of station objects with id and prices
 * @param {string[]} selectedFuelTypes - Fuel types to display as pie slices
 * @param {Map} fuelLevelsMap - Map of fuel type -> Map of station id -> price level ('low'|'medium'|'high')
 * @returns {L.DivIcon} Leaflet divIcon for the cluster marker
 */
function getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap) {
  const n = selectedFuelTypes ? selectedFuelTypes.length : 0;

  if (n === 0) {
    const count = stations && stations.length > 0 ? String(stations.length) : '0';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#888"/></svg>';
    return L.divIcon({
      className: 'cluster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: buildClusterHTML(count, svg),
    });
  }

  const size = 28;
  const cx = size / 2;
  const cy = size / 2;
  const r = 13;
  const strokeW = 2;
  const innerR = r - strokeW / 2;
  const sliceDeg = 360 / n;
  const PI = Math.PI;

  const svgParts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'];

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

    const startAngle = (i * sliceDeg - 90) * PI / 180;
    const endAngle = ((i + 1) * sliceDeg - 90) * PI / 180;

    const ex1 = cx + innerR * Math.cos(startAngle);
    const ey1 = cy + innerR * Math.sin(startAngle);
    const ex2 = cx + innerR * Math.cos(endAngle);
    const ey2 = cy + innerR * Math.sin(endAngle);
    const largeArc = sliceDeg > 180 ? 1 : 0;

    svgParts.push('<path d="M ' + cx + ' ' + cy + ' L ' + ex1.toFixed(2) + ' ' + ey1.toFixed(2) + ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArc + ' 1 ' + ex2.toFixed(2) + ' ' + ey2.toFixed(2) + ' Z" fill="' + color + '" stroke="#fff" stroke-width="' + strokeW + '" stroke-linejoin="round"/>');
  }

  svgParts.push('</svg>');
  const svg = svgParts.join('');
  const count = String(stations.length);

  return L.divIcon({
    className: 'cluster-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: buildClusterHTML(count, svg),
  });
}

export { getClusterIcon };
