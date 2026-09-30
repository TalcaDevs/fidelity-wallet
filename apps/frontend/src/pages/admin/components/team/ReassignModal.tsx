import { useState, type FormEvent } from 'react';
import type { StaffMemberDto } from '@fidelity/shared';
import { Modal } from '../../../../components/ui/Modal';
import type { LocationOption } from '../../../../services/locationsService';
import { LocationSelect } from './LocationSelect';

export function ReassignModal({
  member,
  locations,
  onClose,
  onReassign,
}: {
  member: StaffMemberDto;
  locations: LocationOption[];
  onClose: () => void;
  onReassign: (locationId: string) => Promise<boolean>;
}) {
  const [locationId, setLocationId] = useState(member.locationId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const unchanged = locationId === member.locationId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const ok = await onReassign(locationId);
    if (ok) onClose();
    else setIsSubmitting(false);
  }

  return (
    <Modal title="Cambiar de local" description={member.email ?? undefined} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <LocationSelect id="reassign-location" locations={locations} value={locationId} onChange={setLocationId} />
        <button
          type="submit"
          disabled={unchanged || !locationId || isSubmitting}
          className="w-full py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  );
}
