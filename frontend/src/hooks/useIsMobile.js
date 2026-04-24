import { useEffect } from 'react';
import { useIsMobile as useIsMobileRaw } from 'react-device-detect';

export function useIsMobile() {
  const isMobile = useIsMobileRaw();

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('mobile');
    } else {
      document.body.classList.remove('mobile');
    }

    return () => {
      document.body.classList.remove('mobile');
    };
  }, [isMobile]);

  return isMobile;
}
