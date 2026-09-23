import { useState } from 'react';
import { validateRUT, isPhone } from '../../utils/validators';

interface ManualFallbackProps {
  onSubmit: (identifier: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function ManualFallback({ onSubmit, onCancel, isLoading }: ManualFallbackProps) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanId = identifier.trim();
    if (!cleanId) return;

    if (!validateRUT(cleanId) && !isPhone(cleanId)) {
      setError('Ingresa un RUT (ej: 12.345.678-9) o un teléfono válido');
      return;
    }

    onSubmit(cleanId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white duration-300">
      <div className="flex-1 p-6 flex flex-col justify-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h2 className="text-3xl font-black mb-2">Ingreso Manual</h2>
          <p className="text-slate-400 font-medium text-lg">Busca al cliente por RUT o Teléfono.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="12.345.678-9 o +569..."
              className="w-full bg-slate-800 border-2 border-slate-700 focus:border-blue-500 rounded-2xl px-6 py-5 text-xl font-medium outline-none transition-colors"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm font-bold mt-2 px-1">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading || identifier.trim().length < 4}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xl py-5 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
          >
            {isLoading ? 'Buscando...' : 'Buscar Cliente'}
          </button>
        </form>

        <button 
          onClick={onCancel}
          className="mt-8 py-4 font-bold text-slate-400 hover:text-white transition-colors"
        >
          ← Volver a la cámara
        </button>
      </div>
    </div>
  );
}
