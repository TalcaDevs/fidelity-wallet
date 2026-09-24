import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCamProps {
  onScanSuccess: (decodedText: string) => void;
  isActive: boolean;
}

export function QRCam({ onScanSuccess, isActive }: QRCamProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const lastScanRef = useRef<{ text: string; time: number } | null>(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!isActive) {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().then(() => {
          isScanningRef.current = false;
        }).catch(() => {});
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
            (decodedText: string) => {
              const now = Date.now();
              const lastScan = lastScanRef.current;
              // Cooldown: 2 seconds for the exact same QR code, 1 second for a different one
              const cooldown = lastScan && lastScan.text === decodedText ? 2000 : 1000;
              
              if (!lastScan || (now - lastScan.time > cooldown)) {
                lastScanRef.current = { text: decodedText, time: now };
                onScanSuccess(decodedText);
              }
            },
            () => {
              // ignore background scan errors
            }
          );
          isScanningRef.current = true;
          setCameraError(false);
        } catch (err) {
          setCameraError(true);
        }
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().then(() => {
          isScanningRef.current = false;
        }).catch(() => {});
      }
    };
  }, [isActive, onScanSuccess]);

  if (cameraError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 rounded-3xl shadow-2xl p-6 text-center border-2 border-red-500/20">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11l4 4m0-4l-4 4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Error de cámara</h3>
        <p className="text-slate-400 font-medium">No pudimos acceder a la cámara. Revisa los permisos de tu navegador o usa el ingreso manual arriba.</p>
      </div>
    );
  }

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
        </div>
      </div>
    </div>
  );
}
