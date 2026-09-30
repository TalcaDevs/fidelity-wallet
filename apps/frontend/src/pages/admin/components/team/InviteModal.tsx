import { useState, type FormEvent } from 'react';
import { STAFF_PASSWORD_MIN } from '@fidelity/shared';
import { Modal } from '../../../../components/ui/Modal';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { errorMessage } from '../../../../hooks/useAsyncData';
import type { LocationOption } from '../../../../services/locationsService';
import { LocationSelect } from './LocationSelect';

const INPUT_CLASSES =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue';

/** Se monta solo mientras está abierto: al cerrarlo el formulario se descarta. */
export function InviteModal({
  locations,
  onClose,
  onInvite,
}: {
  locations: LocationOption[];
  onClose: () => void;
  onInvite: (input: { email: string; locationId: string; password?: string }) => Promise<void>;
}) {
  const activeLocations = locations.filter((l) => l.isActive);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Con un solo local no hay nada que elegir.
  const [locationId, setLocationId] = useState(activeLocations.length === 1 ? activeLocations[0].id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < STAFF_PASSWORD_MIN;
  const canSubmit = email.trim() !== '' && locationId !== '' && !passwordTooShort && !isSubmitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onInvite({ email: email.trim(), locationId, password: password || undefined });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo invitar al usuario'));
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="Agregar usuario"
      description="Ingresa el correo del mesero y el local donde trabajará. Si le asignas una contraseña, no recibe correo de invitación."
      onClose={onClose}
    >
      {error && <div className="mb-5"><ErrorAlert message={error} /></div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Correo electrónico</label>
          <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT_CLASSES} />
        </div>
        <div>
          <label htmlFor="invite-location" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Local</label>
          <LocationSelect id="invite-location" locations={locations} value={locationId} onChange={setLocationId} />
        </div>
        <div>
          <label htmlFor="invite-password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contraseña (opcional)</label>
          <input
            id="invite-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Déjala vacía para enviar una invitación"
            className={INPUT_CLASSES}
          />
          {passwordTooShort && (
            <p className="text-xs text-red-600 mt-1">Mínimo {STAFF_PASSWORD_MIN} caracteres.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Procesando...' : password ? 'Crear cuenta' : 'Enviar invitación'}
        </button>
      </form>
    </Modal>
  );
}
