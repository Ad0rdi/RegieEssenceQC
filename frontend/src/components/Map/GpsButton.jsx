import { useRef } from 'react';

export default function GpsButton({ onGpsClick }) {
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
  };

  const handleGpsClick = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    const timeoutRef = setTimeout(() => {
      if (successReceivedRef.current) return;
      navigator.geolocation.getCurrentPosition(
        showPosition,
        handleError,
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
      );
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutRef);
        showPosition(pos);
      },
      (err) => {
        clearTimeout(timeoutRef);
        if (successReceivedRef.current) return;
        navigator.geolocation.getCurrentPosition(
          showPosition,
          handleError,
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
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
