import { useState } from 'react';
import { IdentifierInput, IdentifierValue } from '../../components/ui/IdentifierInput';

interface ManualFallbackProps {
  /** Recibe el tipo y el valor: RUT formateado ("12.345.678-5"), teléfono completo ("+56912345678") o correo. */
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
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div data-entry-stagger className="mx-auto my-auto w-full max-w-lg rounded-3xl border border-panel-border bg-panel-surface p-6 sm:p-8 shadow-panel">
        <div className="mb-8">
          <div className="w-16 h-16 bg-panel-primary/20 text-panel-accent rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Ingreso Manual</h2>
          <p className="text-panel-muted font-medium text-sm leading-relaxed">Busca al cliente por RUT, teléfono o correo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <IdentifierInput variant="wallet" autoFocus onChange={setIdentifier} showErrors={submitted} />
          <button
            type="submit"
            // Habilitado siempre: al pulsarlo con un dato incompleto se muestra el error (si
            // estuviera deshabilitado, el cajero no sabría por qué "no pasa nada").
            className="w-full bg-panel-primary text-white hover:bg-panel-primary/90 disabled:opacity-50 font-bold text-xl py-5 rounded-2xl shadow-lg shadow-panel-primary/15 transition-colors"
          >
            Buscar Cliente
          </button>
        </form>

        <button 
          onClick={onCancel}
          className="mt-8 py-4 font-bold text-panel-muted hover:text-panel-accent transition-colors"
        >
          ← Volver a la cámara
        </button>
      </div>
    </div>
  );
}
