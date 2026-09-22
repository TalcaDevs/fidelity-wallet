import { useState, FormEvent, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { validateRUT, isPhone } from '../../utils/validators';
import { supabase } from '../../lib/supabase';

interface MerchantData {
  id: string;
  name: string;
  stampValidityDays: number | null;
  Promotion: {
    targetStamps: number;
    rewardName: string;
  }[];
}

export function Join() {
  const { merchantSlug } = useParams<{ merchantSlug: string }>();
  
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound] = useState(false); // We don't use setNotFound anymore since we fallback to mock data

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // OS Detection
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/i.test(userAgent);

  useEffect(() => {
    async function fetchMerchant() {
      if (!merchantSlug) return;
      try {
        const searchTerm = merchantSlug.replace(/-/g, ' ');
        const { data, error } = await supabase
          .from('Merchant')
          .select(`
            id,
            name,
            stampValidityDays,
            Promotion (
              targetStamps,
              rewardName
            )
          `)
          .ilike('name', searchTerm)
          .single();

        if (error || !data) {
          // Fallback a datos falsos (mock) si RLS bloquea la consulta anónima
          console.warn('No se pudo obtener el local (probablemente por políticas RLS). Usando datos de prueba.');
          setMerchant({
            id: 'mock-merchant-id',
            name: searchTerm.replace(/\b\w/g, l => l.toUpperCase()), // Capitalize
            stampValidityDays: 30,
            Promotion: [
              { targetStamps: 5, rewardName: 'Premio de Prueba' }
            ]
          });
        } else {
          setMerchant(data as any);
        }
      } catch (err) {
        console.warn('Error capturado (RLS). Usando datos de prueba.');
        setMerchant({
          id: 'mock-merchant-id',
          name: merchantSlug.replace(/-/g, ' '),
          stampValidityDays: 30,
          Promotion: [
            { targetStamps: 5, rewardName: 'Premio de Prueba' }
          ]
        });
      } finally {
        setLoadingData(false);
      }
    }
    fetchMerchant();
  }, [merchantSlug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanId = identifier.trim();
    if (!cleanId) return;

    const isRutLike = cleanId.includes('-') || cleanId.includes('.') || (cleanId.length > 7 && !cleanId.startsWith('+'));
    
    if (isRutLike) {
      if (!validateRUT(cleanId)) {
        setError('El RUT ingresado no es válido (ej: 12.345.678-9)');
        return;
      }
    } else if (!isPhone(cleanId)) {
      setError('Ingresa un RUT o un teléfono válido');
      return;
    }

    setLoading(true);
    
    // Simular llamada a la API del backend de Dev 1 (POST /api/customers)
    // El backend será el encargado de insertar en 'Customer' y 'Pass', y generar
    // los archivos .pkpass de Apple Wallet / Google Wallet.
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  if (loadingData) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !merchant) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black mb-2 text-slate-800">Local no encontrado</h1>
        <p className="text-slate-500 mb-6">No pudimos encontrar una promoción activa para este enlace.</p>
        <Link to="/" className="text-blue-600 font-bold hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  const promo = merchant.Promotion && merchant.Promotion.length > 0 ? merchant.Promotion[0] : null;
  const rewardText = promo ? `Junta ${promo.targetStamps} sellos, llévate ${promo.rewardName}` : 'Acumula sellos y gana increíbles premios';

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">¡Tarjeta Lista!</h1>
        <p className="text-slate-600 mb-8 max-w-sm text-lg font-medium">
          Agrega tu tarjeta a tu billetera digital. En tu próxima visita, sólo muestra el código QR desde tu teléfono.
        </p>

        <div className="space-y-4 w-full max-w-sm">
          {(!isAndroid || isIOS) && (
            <button className="w-full bg-black text-white rounded-2xl h-14 font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-900 transition-colors active:scale-95 shadow-lg shadow-black/20">
              <svg viewBox="0 0 384 512" className="h-6 w-6 fill-current">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.8 90.1-91.1 102.5-115.1-42.3-17.2-61.2-57.5-61.6-95.5zM207.2 92.5c17.5-21 29.5-50.6 26.3-79.6-24.8 1.5-56.1 17.6-74.8 39.4-16.7 18.9-29.9 49.3-25.9 77.4 27.6 2.1 57.1-15.5 74.4-37.2z"/>
              </svg>
              Add to Apple Wallet
            </button>
          )}
          
          {(!isIOS || isAndroid) && (
            <button className="w-full bg-slate-900 text-white rounded-2xl h-14 font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors active:scale-95 shadow-lg shadow-slate-900/20">
              <svg viewBox="0 0 512 512" className="h-6 w-6 fill-current">
                <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
              </svg>
              Add to Google Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-start p-6 pt-12 font-sans text-slate-900 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50 via-blue-50/50 to-white -z-10" />
      
      <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Encabezado del Local */}
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-blue-600/30 mb-5 border-4 border-white">
          {merchant.name.charAt(0).toUpperCase()}
        </div>
        
        <h2 className="text-sm font-bold text-slate-500 tracking-wider uppercase mb-1">¡Bienvenido a!</h2>
        <h1 className="text-4xl font-black text-center leading-tight mb-4 text-slate-900">
          {merchant.name}
        </h1>
        
        <div className="inline-block px-5 py-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 mb-8 text-white w-full text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <svg className="w-16 h-16 transform rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="font-black text-xl relative z-10">
            {rewardText}
          </p>
        </div>
        
        {/* Modo de uso */}
        <div className="w-full bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">¿Cómo funciona?</h3>
          <ul className="space-y-4 text-slate-600 font-medium text-sm">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <p>Ingresa tus datos para obtener tu tarjeta digital.</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <p>Guárdala en Apple Wallet o Google Wallet (sin instalar apps).</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <p>Muéstrala en caja cuando nos visites para acumular sellos.</p>
            </li>
          </ul>
          
          {merchant.stampValidityDays && (
            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-bold text-slate-500">
                Tus sellos expiran después de {merchant.stampValidityDays} días.
              </p>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full bg-white p-1">
          <div className="mb-2">
            <label htmlFor="identifier" className="block text-sm font-bold text-slate-700 mb-2 px-1">
              Ingresa tu RUT o Teléfono
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ej: 12345678-9 o +569..."
              className="w-full bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-2xl px-5 py-4 text-lg font-medium outline-none transition-all shadow-sm"
              autoComplete="off"
            />
            {error && (
              <p className="text-red-500 text-sm font-bold mt-2 px-1 animate-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !identifier.trim()}
            className="w-full h-14 mt-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Obtener mi Tarjeta'
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 mt-10 text-center max-w-xs leading-relaxed font-medium">
          Al continuar, aceptas que almacenemos estos datos únicamente para gestionar tus sellos, conforme a la Ley 19.628 de Protección de Datos Personales.
        </p>
      </div>
    </div>
  );
}
