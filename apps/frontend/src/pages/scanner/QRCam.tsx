import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRCamProps {
  onScanSuccess: (decodedText: string) => void;
  isActive: boolean;
}

// Zona de lectura: 80% del lado menor del video. El marco azul del overlay mide 250px de CSS,
// pero el video se recorta con object-cover, así que un qrbox fijo en px del video no coincide
// con lo que el cajero ve. Leyendo casi todo el cuadro, lo que está dentro del marco se decodifica.
const qrbox = (viewfinderWidth: number, viewfinderHeight: number) => {
  const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.8);
  return { width: size, height: size };
};

// start()/stop() de html5-qrcode son asíncronos y fallan si se solapan. La cola es del MÓDULO,
// no de cada instancia: al volver de "Manual" a la cámara se monta un QRCam nuevo, y su start()
// debe esperar al stop() del anterior (dos getUserMedia a la vez dan NotReadableError en
// iOS/Android). También cubre el montaje doble de StrictMode.
let cameraLifecycle: Promise<void> = Promise.resolve();

export function QRCam({ onScanSuccess, isActive }: QRCamProps) {
  const lastScanRef = useRef<{ text: string; time: number } | null>(null);
  // El callback cambia en cada render del padre; guardarlo en un ref evita reiniciar la cámara.
  const onScanRef = useRef(onScanSuccess);
  const [cameraError, setCameraError] = useState(false);
  // Cambiarlo reintenta abrir la cámara (botón "Reintentar" de la vista de error).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onScanRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    cameraLifecycle = cameraLifecycle.then(async () => {
      if (cancelled) return;
      scanner = new Html5Qrcode('reader', {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        // Usa el BarcodeDetector nativo (Chrome/Android) cuando existe: detecta mucho mejor.
        useBarCodeDetectorIfSupported: true,
      });
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox },
          (decodedText: string) => {
            const now = Date.now();
            const lastScan = lastScanRef.current;
            // Cooldown: 2 seconds for the exact same QR code, 1 second for a different one
            const cooldown = lastScan && lastScan.text === decodedText ? 2000 : 1000;

            if (!lastScan || (now - lastScan.time > cooldown)) {
              lastScanRef.current = { text: decodedText, time: now };
              onScanRef.current(decodedText.trim());
            }
          },
          () => {
            // ignore background scan errors
          }
        );
        if (!cancelled) setCameraError(false);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    });

    return () => {
      cancelled = true;
      cameraLifecycle = cameraLifecycle.then(async () => {
        if (!scanner) return;
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch {
          // el elemento pudo haberse desmontado ya
        }
      });
    };
  }, [isActive, attempt]);

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
        <p className="text-slate-400 font-medium mb-6">No pudimos acceder a la cámara. Revisa los permisos de tu navegador o usa el ingreso manual arriba.</p>
        <button
          type="button"
          onClick={() => {
            setCameraError(false);
            setAttempt((n) => n + 1);
          }}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-colors"
        >
          Reintentar
        </button>
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
