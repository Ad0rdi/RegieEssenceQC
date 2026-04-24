import { useState, useEffect } from 'react';

const MOBILE_MAX_WIDTH = 767;

function checkIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(checkIsMobile);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('mobile');
    } else {
      document.body.classList.remove('mobile');
    }
  }, [isMobile]);

  return isMobile;
}
