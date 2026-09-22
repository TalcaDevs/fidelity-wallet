import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCamProps {
  onScanSuccess: (decodedText: string) => void;
  isActive: boolean;
}

export function QRCam({ onScanSuccess, isActive }: QRCamProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().then(() => {
          isScanningRef.current = false;
        }).catch(console.error);
      }
      return;
    }

    const startScanner = async () => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      if (!isScanningRef.current) {
        try {
          await scannerRef.current.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              // Haptic feedback if supported
              if (navigator.vibrate) navigator.vibrate(50);
              onScanSuccess(decodedText);
            },
            (errorMessage) => {
              // ignore background scan errors
            }
          );
          isScanningRef.current = true;
        } catch (err) {
          console.error("Camera access failed", err);
        }
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().then(() => {
          isScanningRef.current = false;
        }).catch(console.error);
      }
    };
  }, [isActive, onScanSuccess]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black rounded-3xl shadow-2xl">
      <div id="reader" className="w-full h-full min-h-[300px] bg-slate-900 border-none [&_video]:object-cover" />
      <div className="absolute inset-0 pointer-events-none border-[3px] border-white/20 rounded-3xl z-10 m-4" />
      <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
        <div className="w-[250px] h-[250px] border-2 border-blue-500 rounded-2xl relative shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]">
          {/* Corner accents */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
          
          {/* Scanning line animation */}
          <div className="absolute inset-0 w-full h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-scan-line" />
        </div>
      </div>
    </div>
  );
}
