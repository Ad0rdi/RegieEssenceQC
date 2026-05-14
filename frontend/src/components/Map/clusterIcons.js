import L from 'leaflet';
import { interpolateColor } from './mapIcons';

function buildClusterHTML(count, gradient) {
  const bgStyle = 'width:32px;height:32px;border-radius:8px;background:' + gradient + ';';
  return '<div class="cluster-marker-inner" style="' + bgStyle + '">' +
    '<div class="cluster-badge">' + count + '</div></div>';
}

function getClusterIcon(stations, selectedFuelTypes, globalPriceRange, clusterPrices) {
  const count = (stations && stations.length > 0) ? String(stations.length) : '0';
  const n = selectedFuelTypes ? selectedFuelTypes.length : 0;

  let gradient;
  if (n === 0) {
    gradient = '#888';
  } else if (n === 1) {
    const fuelType = selectedFuelTypes[0];
    const minPrice = clusterPrices ? clusterPrices[fuelType] : null;
    let color = '#888';
    if (minPrice != null && globalPriceRange) {
      const range = globalPriceRange[fuelType];
      if (range) {
        color = interpolateColor(range.min, range.max, minPrice);
      }
    }
    gradient = color;
  } else {
    const gradients = [];
    const sliceDeg = 360 / n;
    for (let i = 0; i < n; i++) {
      const fuelType = selectedFuelTypes[i];
      const minPrice = clusterPrices ? clusterPrices[fuelType] : null;
      let color = '#888';
      if (minPrice != null && globalPriceRange) {
        const range = globalPriceRange[fuelType];
        if (range) {
          color = interpolateColor(range.min, range.max, minPrice);
        }
      }
      const start = i * sliceDeg;
      const end = (i + 1) * sliceDeg;
      gradients.push(color + ' ' + start.toFixed(1) + 'deg ' + end.toFixed(1) + 'deg');
    }
    gradient = 'conic-gradient(' + gradients.join(', ') + ')';
  }

  return L.divIcon({
    className: 'cluster-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: buildClusterHTML(count, gradient),
  });
}

export { getClusterIcon };
