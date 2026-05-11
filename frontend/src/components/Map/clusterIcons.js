import L from 'leaflet';
import { PRICING_COLORS } from './mapIcons';

/**
 * Builds the HTML string for a cluster marker with count badge.
 *
 * @param {string} count - Number of stations in the cluster
 * @param {string} background - CSS background (color or conic-gradient)
 * @returns {string} HTML string for the cluster marker
 */
function buildClusterHTML(count, background) {
  return '<div class="cluster-marker-inner" style="background:' + background + '"><div class="cluster-badge">' + count + '</div></div>';
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
  if (!stations || stations.length === 0) {
    return L.divIcon({
      className: 'cluster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: buildClusterHTML('0', '#888'),
    });
  }

  const n = selectedFuelTypes ? selectedFuelTypes.length : 0;

  if (n === 0) {
    return L.divIcon({
      className: 'cluster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: buildClusterHTML(String(stations.length), '#888'),
    });
  }

  const slices = [];

  for (let i = 0; i < n; i++) {
    const fuelType = selectedFuelTypes[i];
    const start = (i / n) * 100;
    const end = ((i + 1) / n) * 100;

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

    slices.push(color + ' ' + start + '% ' + end + '%');
  }

  const gradient = 'conic-gradient(' + slices.join(', ') + ')';

  return L.divIcon({
    className: 'cluster-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: buildClusterHTML(String(stations.length), gradient),
  });
}

export { getClusterIcon };
