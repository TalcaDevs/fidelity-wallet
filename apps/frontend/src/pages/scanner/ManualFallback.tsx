import { useState } from 'react';
import { IdentifierInput, IdentifierValue } from '../../components/ui/IdentifierInput';

interface ManualFallbackProps {
  /** Recibe el tipo y el valor: RUT formateado ("12.345.678-5") o teléfono completo ("+56912345678"). */
  onSubmit: (identifier: IdentifierValue) => void;
  onCancel: () => void;
}

export function ManualFallback({ onSubmit, onCancel }: ManualFallbackProps) {
  const [identifier, setIdentifier] = useState<IdentifierValue>({ kind: 'rut', value: '', isValid: false });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!identifier.isValid) return;
    onSubmit(identifier);
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
          <IdentifierInput variant="dark" autoFocus onChange={setIdentifier} showErrors={submitted} />
          <button
            type="submit"
            // Habilitado siempre: al pulsarlo con un dato incompleto se muestra el error (si
            // estuviera deshabilitado, el cajero no sabría por qué "no pasa nada").
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xl py-5 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
          >
            Buscar Cliente
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
