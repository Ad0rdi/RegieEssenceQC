import { useLeaflet } from 'react-leaflet';

export default function GpsButton({ onGpsClick }) {
  const { map } = useLeaflet();

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (map) {
          map.flyTo([lat, lng], 15, { duration: 1.5 });
        }
        if (onGpsClick) onGpsClick({ lat, lng });
      },
      (err) => {
        const messages = {
          1: "Accès à la position refusé. Veuillez autoriser la géolocalisation.",
          2: "Position indisponible. Vérifiez les paramètres de votre appareil.",
          3: "Délai d'attente dépassé. Réessayez s'il vous plaît.",
        };
        alert(messages[err.code] || `Erreur de géolocalisation: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="leaflet-gps-btn-wrapper">
      <button
        className="leaflet-gps-btn"
        onClick={handleGpsClick}
        title="Ma position"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none" />
        </svg>
      </button>
    </div>
  );
}
