import { useState, type FormEvent } from 'react';
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_TEXT_MAX,
  type CreateTicketInput,
  type TicketCategory,
} from '@fidelity/shared';
import type { LocationOption } from '../../../../services/locationsService';
import { PHONE_COUNTRIES, descriptionError, isValidE164, toE164 } from '../../../../lib/supportForm';
import { AttachmentPicker } from './AttachmentPicker';

const FIELD_CLASSES =
  'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue';
const LABEL_CLASSES = 'block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2';
const HINT_CLASSES = 'text-xs text-slate-500 mt-1';

export function SupportForm({
  locations,
  onSubmit,
}: {
  locations: LocationOption[];
  onSubmit: (input: CreateTicketInput, attachment: File | null) => Promise<boolean>;
}) {
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [dial, setDial] = useState<string>(PHONE_COUNTRIES[0].dial);
  const [phone, setPhone] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const contactPhone = toE164(dial, phone);
  const phoneInvalid = contactPhone !== null && !isValidE164(contactPhone);
  const descriptionProblem = descriptionError(description);
  const isValid = category !== '' && !descriptionProblem && !phoneInvalid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (category === '' || !isValid || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(
      {
        category,
        description: description.trim(),
        locationId: locationId || undefined,
        contactPhone: contactPhone ?? undefined,
      },
      attachment,
    );
    setSubmitting(false);
    if (ok) {
      setCategory('');
      setDescription('');
      setLocationId('');
      setPhone('');
      setAttachment(null);
    }
  }

  return (
    <section className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">¿Necesitas ayuda?</h2>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="support-category" className={LABEL_CLASSES}>Categoría</label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            required
            className={FIELD_CLASSES}
          >
            <option value="" disabled>Selecciona una categoría</option>
            {TICKET_CATEGORIES.map((key) => (
              <option key={key} value={key}>{TICKET_CATEGORY_LABELS[key]}</option>
            ))}
          </select>
          <p className={HINT_CLASSES}>Elige la más cercana.</p>
        </div>

        <div>
          <label htmlFor="support-description" className={LABEL_CLASSES}>Describe tu problema</label>
          <textarea
            id="support-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuéntanos qué pasó, en qué pantalla y qué esperabas que sucediera"
            maxLength={TICKET_TEXT_MAX}
            rows={5}
            required
            className={`${FIELD_CLASSES} resize-y`}
          />
          <p className={HINT_CLASSES}>
            {description.length > 0 && descriptionProblem
              ? descriptionProblem
              : `${description.trim().length} / ${TICKET_TEXT_MAX}`}
          </p>
        </div>

        {locations.length > 0 && (
          <div>
            <label htmlFor="support-location" className={LABEL_CLASSES}>Local (opcional)</label>
            <select id="support-location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={FIELD_CLASSES}>
              <option value="">Toda la marca</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="support-phone" className={LABEL_CLASSES}>Teléfono (opcional)</label>
          <div className="flex gap-2">
            <select aria-label="País" value={dial} onChange={(e) => setDial(e.target.value)} className={`${FIELD_CLASSES} w-auto`}>
              {PHONE_COUNTRIES.map((country) => (
                <option key={country.code} value={country.dial}>{country.code} {country.dial}</option>
              ))}
            </select>
            <input
              id="support-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9 1234 5678"
              className={FIELD_CLASSES}
            />
          </div>
          <p className={`text-xs mt-1 ${phoneInvalid ? 'text-red-600' : 'text-slate-500'}`}>
            {phoneInvalid
              ? 'Revisa el número: con el código de país debe tener entre 8 y 15 dígitos.'
              : 'Déjanos tu número si prefieres que te contactemos por teléfono o WhatsApp.'}
          </p>
        </div>

        <div>
          <label htmlFor="support-attachment" className={LABEL_CLASSES}>Adjuntar captura (opcional)</label>
          <AttachmentPicker id="support-attachment" file={attachment} onChange={setAttachment} />
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/30"
        >
          {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </section>
  );
}
