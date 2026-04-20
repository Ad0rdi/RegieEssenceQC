import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { selectedIcon } from './mapIcons';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

function MapMarkers({ stations, selectedStationId, onStationClick }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    stations.forEach((station) => {
      const marker = L.marker(
        [station.lat, station.lng],
        selectedStationId === station.id
          ? { icon: selectedIcon }
          : {}
      ).on('click', () => onStationClick(station));

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [stations, selectedStationId, onStationClick, map]);

  return null;
}

export default MapMarkers;
