import { useState, type FormEvent } from 'react';
import { STAFF_PASSWORD_MIN, type InviteStaffInput } from '@fidelity/shared';
import { Modal } from '../../../../components/ui/Modal';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { errorMessage } from '../../../../hooks/useAsyncData';
import type { LocationOption } from '../../../../services/locationsService';
import { LocationSelect } from './LocationSelect';

const INPUT_CLASSES =
  'w-full bg-panel-soft border border-panel-border rounded-xl px-4 py-3 text-panel-text font-medium focus:outline-none focus:ring-2 focus:ring-panel-accent/50 focus:border-panel-accent';

/** Se monta solo mientras está abierto: al cerrarlo el formulario se descarta. */
export function InviteModal({
  locations,
  onClose,
  onInvite,
}: {
  locations: LocationOption[];
  onClose: () => void;
  onInvite: (input: InviteStaffInput) => Promise<void>;
}) {
  const activeLocations = locations.filter((l) => l.isActive);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      await onInvite({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        locationId,
        password: password || undefined,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo invitar al usuario'));
      setIsSubmitting(false);
    }
  }

  return (
    <Modal trapFocus
      title="Agregar usuario"
      description="Ingresa los datos del mesero o cajero y el local donde trabajará. Si le asignas una contraseña, no recibe correo de invitación."
      onClose={onClose}
    >
      {error && <div className="mb-5"><ErrorAlert message={error} /></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="invite-first-name" className="block text-sm font-bold text-panel-text mb-2">
              Nombre
            </label>
            <input
              id="invite-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ej: Juan"
              className={INPUT_CLASSES}
            />
          </div>
          <div>
            <label htmlFor="invite-last-name" className="block text-sm font-bold text-panel-text mb-2">
              Apellido
            </label>
            <input
              id="invite-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ej: Pérez"
              className={INPUT_CLASSES}
            />
          </div>
        </div>
        <div>
          <label htmlFor="invite-email" className="block text-sm font-bold text-panel-text mb-2">
            Correo electrónico
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="cajero@ejemplo.com"
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label htmlFor="invite-location" className="block text-sm font-bold text-panel-text mb-2">
            Local
          </label>
          <LocationSelect id="invite-location" locations={locations} value={locationId} onChange={setLocationId} />
        </div>
        <div>
          <label htmlFor="invite-password" className="block text-sm font-bold text-panel-text mb-2">
            Contraseña (opcional)
          </label>
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
          className="w-full py-3.5 rounded-xl bg-panel-primary hover:bg-panel-primary/90 text-white font-bold transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Procesando...' : password ? 'Crear cuenta' : 'Enviar invitación'}
        </button>
      </form>
    </Modal>
  );
}
