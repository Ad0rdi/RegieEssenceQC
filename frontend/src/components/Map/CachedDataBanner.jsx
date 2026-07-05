import { useState, useEffect } from 'react';

function CachedDataBanner({ fromCache }) {
  const [visible, setVisible] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (fromCache) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [fromCache]);

  if (!visible) return null;

  return (
    <div
      className="cached-data-banner"
      onClick={() => setVisible(false)}
      role="alert"
      aria-live="polite"
    >
      <span>📦 Données en cache</span>
    </div>
  );
}

export default CachedDataBanner;
