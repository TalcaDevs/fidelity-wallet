import {
  CARD_FIELD_KEYS,
  CARD_FRONT_FIELDS_MAX,
  CARD_LINKS_MAX,
  CARD_LINK_LABEL_MAX,
  CARD_LINK_TYPES,
  CARD_LINK_VALUE_MAX,
  CARD_SECTIONS_MAX,
  CARD_SECTION_BODY_MAX,
  CARD_SECTION_HEADER_MAX,
  balanceUnit,
  type CardFieldKey,
  type CardLink,
  type CardLinkType,
  type CardSection,
} from '@fidelity/shared';
import type { CardEditor } from './useCardEditor';
import { GHOST_BUTTON, HINT, INPUT, Section, Toggle } from './ui';

const LINK_TYPES: Record<CardLinkType, { label: string; placeholder: string }> = {
  WEBSITE: { label: 'Sitio web', placeholder: 'https://tunegocio.cl' },
  PHONE: { label: 'Teléfono', placeholder: '+56 9 1234 5678' },
  EMAIL: { label: 'Correo', placeholder: 'hola@tunegocio.cl' },
  WHATSAPP: { label: 'WhatsApp', placeholder: '+56 9 1234 5678' },
  INSTAGRAM: { label: 'Instagram', placeholder: '@tunegocio' },
};

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="shrink-0 p-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
    >
      <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export function DetailsStep({ editor }: { editor: CardEditor }) {
  const { config, saved, updateDetails } = editor;
  if (!config || !saved) return null;
  const { details } = config;
  const unit = balanceUnit(config.type);

  const fieldLabels: Record<CardFieldKey, { label: string; description: string }> = {
    REWARD: { label: 'Premio', description: 'La recompensa más cercana del cliente.' },
    PROGRESS: { label: 'Estado', description: `Cuántos ${unit} le faltan, o si ya puede canjear.` },
    STAMPS_EXPIRY: { label: `Vencimiento de los ${unit}`, description: 'Cuándo vence el saldo más antiguo.' },
    CARD_EXPIRY: {
      label: 'Vencimiento de la tarjeta',
      description: config.validity.type === 'UNLIMITED' ? 'Solo aparece si la tarjeta vence.' : 'La fecha en que vence la tarjeta.',
    },
    MEMBER_SINCE: { label: 'Cliente desde', description: 'Cuándo obtuvo la tarjeta.' },
  };

  const toggleField = (key: CardFieldKey, visible: boolean) =>
    updateDetails({
      fields: visible ? CARD_FIELD_KEYS.filter((k) => k === key || details.fields.includes(k)) : details.fields.filter((k) => k !== key),
      frontFields: visible ? details.frontFields : details.frontFields.filter((k) => k !== key),
    });
  const toggleFront = (key: CardFieldKey, front: boolean) =>
    updateDetails({ frontFields: front ? [...details.frontFields, key] : details.frontFields.filter((k) => k !== key) });

  const setLink = (index: number, patch: Partial<CardLink>) =>
    updateDetails({ links: details.links.map((l, i) => (i === index ? { ...l, ...patch } : l)) });
  const setSection = (index: number, patch: Partial<CardSection>) =>
    updateDetails({ sections: details.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  return (
    <div>
      <Section
        title="Información en el pase"
        description={`El saldo de ${unit} siempre está en el frente. Elige qué más se muestra y hasta ${CARD_FRONT_FIELDS_MAX} datos que lo acompañan en el frente.`}
      >
        <ul className="space-y-2">
          {CARD_FIELD_KEYS.map((key) => {
            const visible = details.fields.includes(key);
            const front = details.frontFields.includes(key);
            const frontFull = !front && details.frontFields.length >= CARD_FRONT_FIELDS_MAX;
            return (
              <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => toggleField(key, e.target.checked)}
                    className="mt-1 w-4 h-4 accent-brand-blue"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{fieldLabels[key].label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{fieldLabels[key].description}</span>
                  </span>
                </label>
                <label className={`flex items-center gap-2 text-xs font-bold ${visible && !frontFull ? 'text-slate-600 dark:text-slate-300 cursor-pointer' : 'text-slate-400'}`}>
                  <input
                    type="checkbox"
                    checked={front}
                    disabled={!visible || frontFull}
                    onChange={(e) => toggleFront(key, e.target.checked)}
                    className="w-4 h-4 accent-brand-blue"
                  />
                  En el frente
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-3">
          <Toggle
            label="Mostrar el nombre del titular"
            description="El primer nombre del cliente, junto al código QR."
            checked={details.showCustomerName}
            onChange={(showCustomerName) => updateDetails({ showCustomerName })}
          />
        </div>
      </Section>

      <Section title="Sitio web" description="Aparece como botón en el frente del pase de Google Wallet.">
        <input
          type="url"
          aria-label="Sitio web"
          value={details.homepageUrl ?? ''}
          maxLength={CARD_LINK_VALUE_MAX}
          onChange={(e) => updateDetails({ homepageUrl: e.target.value.trim() || null })}
          placeholder="https://tunegocio.cl"
          className={INPUT}
        />
      </Section>

      <Section title="Enlaces" description="Accesos útiles en el detalle del pase: redes, WhatsApp, teléfono.">
        <ul className="space-y-3">
          {details.links.map((link, i) => (
            <li key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-start">
              <select
                aria-label={`Tipo del enlace ${i + 1}`}
                value={link.type}
                onChange={(e) => setLink(i, { type: e.target.value as CardLinkType })}
                className={`${INPUT} sm:w-40`}
              >
                {CARD_LINK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LINK_TYPES[type].label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Nombre del enlace ${i + 1}`}
                value={link.label}
                maxLength={CARD_LINK_LABEL_MAX}
                onChange={(e) => setLink(i, { label: e.target.value })}
                placeholder="Nombre visible"
                className={`${INPUT} sm:w-44`}
              />
              <input
                aria-label={`Destino del enlace ${i + 1}`}
                value={link.value}
                maxLength={CARD_LINK_VALUE_MAX}
                onChange={(e) => setLink(i, { value: e.target.value })}
                placeholder={LINK_TYPES[link.type].placeholder}
                className={INPUT}
              />
              <RemoveButton
                label={`Quitar el enlace ${i + 1}`}
                onClick={() => updateDetails({ links: details.links.filter((_, j) => j !== i) })}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={details.links.length >= CARD_LINKS_MAX}
          onClick={() => updateDetails({ links: [...details.links, { type: 'INSTAGRAM', label: 'Instagram', value: '' }] })}
          className={`${GHOST_BUTTON} mt-3`}
        >
          + Agregar enlace
        </button>
      </Section>

      <Section title="Secciones adicionales" description="Textos en el detalle del pase: condiciones, horarios, cómo canjear.">
        <ul className="space-y-3">
          {details.sections.map((section, i) => (
            <li key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex gap-2 items-start">
                <input
                  aria-label={`Título de la sección ${i + 1}`}
                  value={section.header}
                  maxLength={CARD_SECTION_HEADER_MAX}
                  onChange={(e) => setSection(i, { header: e.target.value })}
                  placeholder="Ej. Condiciones"
                  className={INPUT}
                />
                <RemoveButton
                  label={`Quitar la sección ${i + 1}`}
                  onClick={() => updateDetails({ sections: details.sections.filter((_, j) => j !== i) })}
                />
              </div>
              <textarea
                aria-label={`Texto de la sección ${i + 1}`}
                value={section.body}
                rows={3}
                maxLength={CARD_SECTION_BODY_MAX}
                onChange={(e) => setSection(i, { body: e.target.value })}
                placeholder="Ej. Un premio por visita. No acumulable con otras promociones."
                className={`${INPUT} mt-2 resize-y`}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={details.sections.length >= CARD_SECTIONS_MAX}
          onClick={() => updateDetails({ sections: [...details.sections, { header: '', body: '' }] })}
          className={`${GHOST_BUTTON} mt-3`}
        >
          + Agregar sección
        </button>
      </Section>

      <Section title="Aviso cerca de tus locales">
        <Toggle
          label="Recordar la tarjeta cerca de un local"
          description="Google Wallet muestra la tarjeta en la pantalla de bloqueo cuando el cliente pasa cerca de una de tus sucursales con ubicación (hasta 10)."
          checked={details.nearbyNotifications}
          onChange={(nearbyNotifications) => updateDetails({ nearbyNotifications })}
        />
        {details.nearbyNotifications && (
          <p className={HINT}>Usa la ubicación de cada sucursal: si alguna no la tiene, agrégala en Sucursales.</p>
        )}
      </Section>
    </div>
  );
}
