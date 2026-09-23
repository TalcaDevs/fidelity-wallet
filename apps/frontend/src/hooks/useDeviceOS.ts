import { useState, useEffect } from 'react';

export function useDeviceOS() {
  const [os, setOs] = useState({ isIOS: false, isAndroid: false });

  useEffect(() => {
    const win = window as unknown as { opera?: string, MSStream?: unknown };
    const userAgent = navigator.userAgent || navigator.vendor || win.opera || '';
    
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !win.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    setOs({ isIOS, isAndroid });
  }, []);

  return os;
}
