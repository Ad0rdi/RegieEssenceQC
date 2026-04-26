import { useMap } from 'react-leaflet';
import { useRef } from 'react';

const GPS_MESSAGES = {
  1: "Accès à la position refusé. Veuillez autoriser la géolocalisation.",
  2: "Position indisponible. Vérifiez les paramètres de votre appareil.",
  3: "Délai d'attente dépassé. Réessayez s'il vous plaît.",
};

export default function GpsButton({ onGpsClick }) {
  const map = useMap();
  const isRetryingRef = useRef(false);
  const successReceivedRef = useRef(false);

  const showPosition = (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    successReceivedRef.current = true;
    if (onGpsClick) onGpsClick({ lat, lng, accuracy });
  };

  const handleError = (err) => {
    if (successReceivedRef.current) return;

    if (err.code === 3 && !isRetryingRef.current) {
      isRetryingRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (retryPosition) => {
          showPosition(retryPosition);
        },
        (finalErr) => {
          isRetryingRef.current = false;
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
      );
      return;
    }
    isRetryingRef.current = false;
    const msg = GPS_MESSAGES[err.code] || `Erreur de géolocalisation: ${err.message}`;
    alert(msg);
  };

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      showPosition,
      handleError,
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </button>
    </div>
  );
}
