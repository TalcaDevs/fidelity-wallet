import { useState, FormEvent, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { validateRUT, isPhone } from '../../utils/validators';
import { getMerchantWithActivePromo, MerchantPublicData } from '../../services/merchantService';
import { JoinNotFound } from './JoinNotFound';
import { JoinSuccess } from './JoinSuccess';

export function Join() {
  const { merchantId } = useParams<{ merchantId: string }>();
  
  const [merchant, setMerchant] = useState<MerchantPublicData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMerchant() {
      if (!merchantId) return;
      try {
        const data = await getMerchantWithActivePromo(merchantId);
        if (!data) {
          setNotFound(true);
        } else {
          setMerchant(data);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoadingData(false);
      }
    }
    fetchMerchant();
  }, [merchantId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanId = identifier.trim();
    if (!cleanId) return;

    const isRutLike = cleanId.includes('-') || cleanId.includes('.') || cleanId.toLowerCase().endsWith('k');
    let validRut = false;
    let validPhone = false;
    
    if (validateRUT(cleanId)) validRut = true;
    if (isPhone(cleanId)) validPhone = true;

    if (!validRut && !validPhone) {
      if (isRutLike) {
        setError('El RUT ingresado no es válido (ej: 12.345.678-9)');
      } else {
        setError('Ingresa un RUT o un teléfono válido');
      }
      return;
    }

    setLoading(true);
    
    if (import.meta.env.VITE_USE_MOCK_SCAN === 'true') {
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
      }, 1500);
    } else {
      try {
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, identifier: cleanId })
        });
        if (!response.ok) throw new Error('Error al generar pase');
        setLoading(false);
        setSuccess(true);
      } catch (err) {
        setError('Ocurrió un error al procesar tu solicitud.');
        setLoading(false);
      }
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !merchant) {
    return <JoinNotFound />;
  }

  if (success) {
    return <JoinSuccess />;
  }

  const promo = merchant.Promotion && merchant.Promotion.length > 0 ? merchant.Promotion[0] : null;
  const rewardText = promo ? `Junta ${promo.targetStamps} sellos, llévate ${promo.rewardName}` : 'Acumula sellos y gana increíbles premios';

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-start p-6 pt-12 font-sans text-slate-900 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50 via-blue-50/50 to-white -z-10" />
      
      <div className="w-full max-w-md flex flex-col items-center duration-500">
        
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
              <p className="text-red-500 text-sm font-bold mt-2 px-1">
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
