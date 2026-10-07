import { useId } from 'react';
import { Link } from 'react-router-dom';
import {
  CARD_NAME_MAX,
  CARD_REWARDS_MAX,
  CARD_REWARDS_STORAGE_MAX,
  CARD_VALIDITY_DAYS_MAX,
  POINTS_TARGET_MAX,
  REWARD_NAME_MAX,
  STAMPS_TARGET_MAX,
  WELCOME_POINTS_MAX,
  WELCOME_STAMPS_MAX,
  balanceUnit,
  isRewardEnabled,
  resolveRewardCurrency,
  type CardValidityType,
  type CardType,
  type FieldMode,
  type RegistrationField,
} from '@fidelity/shared';
import { ROUTES } from '../../../components/routing/routePaths';
import type { CardEditor } from './useCardEditor';
import { GHOST_BUTTON, HINT, INPUT, LABEL, NumberStepper, Section, Segmented, Toggle } from './ui';

const clp = new Intl.NumberFormat('es-CL');

// Plazos redondos: el dueño piensa en meses, no en días, y así no escribe un valor absurdo.
const BALANCE_VALIDITY: { value: number | null; label: string }[] = [
  { value: null, label: 'No vencen' },
  { value: 30, label: '1 mes' },
  { value: 60, label: '2 meses' },
  { value: 90, label: '3 meses' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '12 meses' },
];

const CARD_VALIDITY: { value: CardValidityType; title: string; description: string }[] = [
  { value: 'UNLIMITED', title: 'Ilimitada', description: 'La tarjeta nunca vence.' },
  { value: 'FIXED_DATE', title: 'Término fijo', description: 'Todas las tarjetas vencen en una fecha.' },
  { value: 'AFTER_JOIN', title: 'Plazo tras obtenerla', description: 'Vence un tiempo después de que el cliente la obtiene.' },
];

const REGISTRATION: { field: RegistrationField; label: string }[] = [
  { field: 'phone', label: 'Teléfono' },
  { field: 'email', label: 'Correo electrónico' },
  { field: 'name', label: 'Nombre' },
  { field: 'birthday', label: 'Cumpleaños' },
  { field: 'rut', label: 'RUT' },
];

const MODE_OPTIONS: { value: FieldMode; label: string }[] = [
  { value: 'REQUIRED', label: 'Requerido' },
  { value: 'OPTIONAL', label: 'Opcional' },
  { value: 'HIDDEN', label: 'No pedir' },
];

/** yyyy-mm-dd del input de fecha ↔ ISO al final de ese día, en la hora del dueño. */
const toDateInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromDateInput = (value: string) => (value ? new Date(`${value}T23:59:59`).toISOString() : null);

export function InfoStep({ editor }: { editor: CardEditor }) {
  const ids = useId();
  const { config, saved, update } = editor;
  if (!config || !saved) return null;

  const isPoints = config.type === 'POINTS';

  const { pesosPerPoint } = saved.points;
  const { validity, registration } = config;
  const rewardLimit = saved.rewardLimit ?? CARD_REWARDS_MAX;
  const activeRewards = config.rewards.filter((reward) => isRewardEnabled(reward, config)).length;
  const canAddReward = activeRewards < rewardLimit && config.rewards.length < CARD_REWARDS_STORAGE_MAX;
  const newRewardCurrency = config.stampsEnabled ? 'STAMPS' : 'POINTS';
  const contactHidden = (field: RegistrationField) =>
    (field === 'phone' && registration.email === 'HIDDEN') || (field === 'email' && registration.phone === 'HIDDEN');

  const setReward = (index: number, patch: { name?: string; target?: number; currency?: CardType }) =>
    update({ rewards: config.rewards.map((r, i) => (i === index ? { ...r, ...patch } : r)) });

  return (
    <div>
      <Section title="Nombre de la tarjeta" description="Es el título que el cliente ve en su billetera.">
        <input
          aria-label="Nombre de la tarjeta"
          value={config.name}
          maxLength={CARD_NAME_MAX}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Ej. Club Café Central"
          className={INPUT}
        />
      </Section>

      <Section
        title="Recompensas"
        description="Cada recompensa tiene un costo en sellos o puntos. Conserva los premios de modalidades desactivadas para volver a ofrecerlos cuando las reactives."
      >
        {config.pointsEnabled && (
          <p className="mb-4 rounded-2xl bg-panel-accent/5 border border-panel-accent/20 px-4 py-3 text-sm text-panel-text">
            Cada compra da <strong>1 punto cada ${clp.format(pesosPerPoint)}</strong>. Puedes cambiar ese valor en{' '}
            <Link to={ROUTES.settings} className="font-bold text-panel-accent underline underline-offset-2">
              Configuración
            </Link>
            .
          </p>
        )}
        <ul className="space-y-3">
          {config.rewards.map((reward, i) => {
            const currency = resolveRewardCurrency(reward, config.type) ?? config.type;
            const rewardPoints = currency === 'POINTS';
            const unit = balanceUnit(currency);
            const enabled = isRewardEnabled(reward, config);
            return (
            <li key={reward.id ?? `new-${i}`} className="rounded-2xl border border-panel-border p-4">
              <div className="flex gap-3 items-start">
                <input
                  aria-label={`Nombre de la recompensa ${i + 1}`}
                  value={reward.name}
                  maxLength={REWARD_NAME_MAX}
                  onChange={(e) => setReward(i, { name: e.target.value })}
                  placeholder="Ej. Café gratis"
                  className={INPUT}
                />
                <button
                  type="button"
                  aria-label={`Quitar la recompensa ${i + 1}`}
                  disabled={!enabled && !!reward.id}
                  title={!enabled && reward.id ? 'Reactiva la modalidad para quitar este premio.' : undefined}
                  onClick={() => update({ rewards: config.rewards.filter((_, j) => j !== i) })}
                  className="shrink-0 p-3 rounded-xl text-panel-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {!enabled && <p className={HINT}>Oculta para los clientes mientras esta modalidad está desactivada.</p>}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <label className="text-sm text-panel-muted">
                  Moneda
                  <select
                    aria-label={`Moneda de la recompensa ${i + 1}`}
                    value={currency}
                    disabled={!!reward.id}
                    title={reward.id ? 'La moneda de un premio existente se conserva. Crea otro premio para usar otra moneda.' : undefined}
                    onChange={(e) => setReward(i, { currency: e.target.value as CardType })}
                    className={`${INPUT} w-auto mt-1`}
                  >
                    <option value="STAMPS" disabled={!enabled && currency !== 'STAMPS' && config.stampsEnabled && activeRewards >= rewardLimit}>Sellos</option>
                    <option value="POINTS" disabled={currency !== 'POINTS' && (!saved.points.enabled || (!enabled && config.pointsEnabled && activeRewards >= rewardLimit))}>Puntos</option>
                  </select>
                </label>
                <span className="text-sm text-panel-muted">A los</span>
                <NumberStepper
                  label={`${unit} de la recompensa ${i + 1}`}
                  value={reward.target}
                  min={1}
                  max={rewardPoints ? POINTS_TARGET_MAX : STAMPS_TARGET_MAX}
                  step={rewardPoints ? 10 : 1}
                  onChange={(target) => setReward(i, { target })}
                />
                <span className="text-sm text-panel-muted">{unit}</span>
                {rewardPoints && (
                  <span className="text-xs text-panel-muted">≈ ${clp.format(reward.target * pesosPerPoint)} en compras</span>
                )}
              </div>
            </li>
          );
          })}
        </ul>
        <button
          type="button"
          disabled={!canAddReward}
          onClick={() => {
            if (!canAddReward) return;
            update({ rewards: [...config.rewards, { name: '', target: newRewardCurrency === 'STAMPS' ? 10 : 100, currency: newRewardCurrency }] });
          }}
          className={`${GHOST_BUTTON} mt-3`}
        >
          + Agregar recompensa
        </button>
        <p className={HINT}>{activeRewards} de {rewardLimit} recompensas activas. Las recompensas ocultas se conservan sin ocupar este cupo.</p>
        {saved.rewardPlanLimit !== undefined && saved.rewardPlanLimit < rewardLimit && (
          <p className={HINT}>Tu plan permite {saved.rewardPlanLimit} recompensas activas. Tus recompensas existentes se conservan aunque superen ese cupo.</p>
        )}
        {saved.rewards.length > 0 && (
          <p className={HINT}>Si quitas una recompensa que ya se canjeó, se desactiva pero su historial se conserva.</p>
        )}
      </Section>

      <Section title="Reglas">
        <div className="space-y-3">
          {(['STAMPS', 'POINTS'] as const).map((currency) => {
            const points = currency === 'POINTS';
            const enabled = points ? config.pointsEnabled : config.stampsEnabled;
            const label = points ? 'Puntos de bienvenida' : 'Sellos de bienvenida';
            const value = points
              ? (config.welcomePoints ?? (isPoints ? config.welcomeBalance : 0))
              : (config.welcomeStamps ?? (!isPoints ? config.welcomeBalance : 0));
            return <div key={currency} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel-soft px-4 py-3">
              <div>
                <p className="text-sm font-bold text-panel-text">{label}</p>
                <p className="text-xs text-panel-muted">{enabled ? 'Los recibe el cliente al obtener la tarjeta por primera vez.' : 'Conservados; no se entregan mientras esta modalidad está desactivada.'}</p>
              </div>
              <NumberStepper
                label={label}
                value={value}
                min={0}
                max={points ? WELCOME_POINTS_MAX : WELCOME_STAMPS_MAX}
                step={points ? 10 : 1}
                onChange={(next) => update({
                  ...(points ? { welcomePoints: next } : { welcomeStamps: next }),
                  ...(config.type === currency ? { welcomeBalance: next } : {}),
                })}
              />
            </div>;
          })}
          {config.stampsEnabled && (
            <Toggle
              label="Límite de 1 sello por día"
              description="El cajero suma a lo más un sello por cliente al día. Tú, como dueño, puedes sumar más indicando el motivo."
              checked={config.dailyStampLimit}
              onChange={(dailyStampLimit) => update({ dailyStampLimit })}
            />
          )}
          {config.pointsEnabled && (
            <p className="rounded-2xl bg-panel-soft px-4 py-3 text-sm text-panel-muted">
              Cuando una compra suma puntos, el cajero ingresa el monto y adjunta la foto de la boleta.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel-soft px-4 py-3">
            <label htmlFor={`${ids}-balance-validity`} className="text-sm font-bold text-panel-text">
              Vigencia de los sellos y puntos entregados
              <span className="block text-xs font-normal text-panel-muted">
                Lo ya entregado no cambia si después modificas este plazo.
              </span>
            </label>
            <select
              id={`${ids}-balance-validity`}
              value={config.stampValidityDays === null ? '' : String(config.stampValidityDays)}
              onChange={(e) => update({ stampValidityDays: e.target.value ? Number(e.target.value) : null })}
              className={`${INPUT} w-auto`}
            >
              {BALANCE_VALIDITY.some((o) => o.value === config.stampValidityDays) ? null : (
                <option value={String(config.stampValidityDays)}>{config.stampValidityDays} días</option>
              )}
              {BALANCE_VALIDITY.map((o) => (
                <option key={o.label} value={o.value === null ? '' : String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Vigencia de la tarjeta" description="Elige cuándo vence la tarjeta. Una tarjeta vencida no suma ni canjea.">
        <div role="radiogroup" aria-label="Vigencia de la tarjeta" className="space-y-2">
          {CARD_VALIDITY.map((option) => {
            const selected = validity.type === option.value;
            return (
              <div
                key={option.value}
                className={`rounded-2xl border-2 px-4 py-3 ${
                  selected ? 'border-panel-accent bg-panel-accent/5' : 'border-panel-border '
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`${ids}-validity`}
                    checked={selected}
                    onChange={() =>
                      update({
                        validity: {
                          type: option.value,
                          expiresAt: option.value === 'FIXED_DATE' ? validity.expiresAt : null,
                          days: option.value === 'AFTER_JOIN' ? (validity.days ?? 365) : null,
                        },
                      })
                    }
                    className="mt-1 accent-panel-accent"
                  />
                  <span>
                    <span className="block text-sm font-bold text-panel-text">{option.title}</span>
                    <span className="block text-xs text-panel-muted">{option.description}</span>
                  </span>
                </label>
                {selected && option.value === 'FIXED_DATE' && (
                  <input
                    type="date"
                    aria-label="Fecha de término"
                    value={toDateInput(validity.expiresAt)}
                    onChange={(e) => update({ validity: { ...validity, expiresAt: fromDateInput(e.target.value) } })}
                    className={`${INPUT} mt-3 w-auto`}
                  />
                )}
                {selected && option.value === 'AFTER_JOIN' && (
                  <div className="flex items-center gap-3 mt-3">
                    <NumberStepper
                      label="Días de vigencia"
                      value={validity.days ?? 365}
                      min={1}
                      max={CARD_VALIDITY_DAYS_MAX}
                      step={30}
                      onChange={(days) => update({ validity: { ...validity, days } })}
                    />
                    <span className="text-sm text-panel-muted">días después de obtenerla</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Datos al registrarse"
        description="Lo que pide el formulario de tu link de registro. Pide al menos el teléfono o el correo: con ellos se busca al cliente en caja."
      >
        <ul className="space-y-2">
          {REGISTRATION.map(({ field, label }) => (
            <li key={field} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-panel-soft px-4 py-3">
              <span className={LABEL}>{label}</span>
              <Segmented
                label={label}
                value={registration[field]}
                options={MODE_OPTIONS.map((o) => ({ ...o, disabled: o.value === 'HIDDEN' && contactHidden(field) }))}
                onChange={(mode) => update({ registration: { ...registration, [field]: mode } })}
              />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
