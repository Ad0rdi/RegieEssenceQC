import L from 'leaflet';
import { PRICING_COLORS } from './mapIcons';

function buildClusterHTML(count, background) {
  var innerStyle = 'width:32px;height:32px;border-radius:8px;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(0,0,0,0.15);position:relative;background:' + background + ';';
  var badgeStyle = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid #888;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#000;';
  return '<div class="cluster-marker-inner" style="' + innerStyle + '"><div class="cluster-badge" style="' + badgeStyle + '">' + count + '</div></div>';
}

function getClusterIcon(stations, selectedFuelTypes, fuelLevelsMap) {
  if (!stations || stations.length === 0) {
    return L.divIcon({
      className: 'cluster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: buildClusterHTML('0', '#888'),
    });
  }

  var n = selectedFuelTypes ? selectedFuelTypes.length : 0;

  if (n === 0) {
    return L.divIcon({
      className: 'cluster-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: buildClusterHTML(String(stations.length), '#888'),
    });
  }

  var slices = [];

  for (var i = 0; i < n; i++) {
    var fuelType = selectedFuelTypes[i];
    var start = (i / n) * 100;
    var end = ((i + 1) / n) * 100;

    var cheapestStation = null;
    var cheapestPrice = Infinity;

    for (var j = 0; j < stations.length; j++) {
      var station = stations[j];
      if (!station || !station.prices) continue;
      var price = station.prices[fuelType];
      if (price == null) continue;
      if (price < cheapestPrice) {
        cheapestPrice = price;
        cheapestStation = station;
      }
    }

    var color = '#888';
    if (cheapestStation) {
      var stationLevels = fuelLevelsMap ? fuelLevelsMap.get(fuelType) : null;
      var level = stationLevels ? stationLevels.get(cheapestStation.id) : null;
      if (level && PRICING_COLORS[level]) {
        color = PRICING_COLORS[level];
      }
    }

    slices.push(color + ' ' + start + '% ' + end + '%');
  }

  var gradient = 'conic-gradient(' + slices.join(', ') + ')';

  return L.divIcon({
    className: 'cluster-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: buildClusterHTML(String(stations.length), gradient),
  });
}

export { getClusterIcon };
