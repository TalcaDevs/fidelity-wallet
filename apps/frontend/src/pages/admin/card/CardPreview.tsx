import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  STAMP_ICON_PATHS,
  autoTextColor,
  balanceUnit,
  linkUri,
  normalizeDesign,
  renderStampStripSvg,
  type CardConfig,
  type CardDesign,
  type CardFieldKey,
} from '@fidelity/shared';

type Platform = 'ANDROID' | 'APPLE';
type Face = 'FRONT' | 'DETAILS';

const clp = new Intl.NumberFormat('es-CL');
const SAMPLE_NAME = 'María';
const SAMPLE_JOINED = new Date('2026-03-14T12:00:00');

const FIELD_LABELS: Record<CardFieldKey, string> = {
  REWARD: 'Premio',
  PROGRESS: 'Estado',
  STAMPS_EXPIRY: 'Próximo vencimiento',
  CARD_EXPIRY: 'Tarjeta válida hasta',
  MEMBER_SINCE: 'Cliente desde',
};

const formatDate = (date: Date) => date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

/** Saldo y textos de ejemplo, calculados como los calcula el backend para un pase real. */
function sample(config: CardConfig) {
  const rewards = [...config.rewards].sort((a, b) => a.target - b.target);
  const isPoints = config.type === 'POINTS';
  const reward = rewards[0] ?? { name: 'Tu premio', target: isPoints ? 100 : 10 };
  const target = Math.max(1, reward.target);
  const balance = isPoints ? Math.floor(target * 0.4) : Math.min(3, target);
  const remaining = target - balance;
  const unit = balanceUnit(config.type, remaining);
  const cardExpiry =
    config.validity.type === 'FIXED_DATE' && config.validity.expiresAt
      ? new Date(config.validity.expiresAt)
      : config.validity.type === 'AFTER_JOIN' && config.validity.days
        ? new Date(SAMPLE_JOINED.getTime() + config.validity.days * 86_400_000)
        : null;

  const values: Record<CardFieldKey, string | null> = {
    REWARD: reward.name || 'Tu premio',
    PROGRESS: remaining <= 0 ? '¡Premio desbloqueado!' : `${remaining === 1 ? 'Falta' : 'Faltan'} ${clp.format(remaining)} ${unit}`,
    STAMPS_EXPIRY: config.stampValidityDays
      ? formatDate(new Date(Date.now() + config.stampValidityDays * 86_400_000))
      : `Tus ${balanceUnit(config.type)} no vencen`,
    CARD_EXPIRY: cardExpiry ? formatDate(cardExpiry) : null,
    MEMBER_SINCE: formatDate(SAMPLE_JOINED),
  };
  const fields = config.details.fields
    .filter((key) => values[key] !== null)
    .map((key) => ({ key, label: FIELD_LABELS[key], value: values[key]! }));

  return {
    target,
    balance,
    balanceLabel: isPoints ? 'Puntos' : 'Sellos',
    balanceValue: isPoints ? clp.format(balance) : `${balance} de ${target}`,
    fields,
    front: fields.filter((f) => config.details.frontFields.includes(f.key)),
  };
}

function useQr(value: string) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 0, width: 200 })
      .then((data) => !cancelled && setQr(data))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [value]);
  return qr;
}

function StampStrip({ design, target, filled }: { design: CardDesign; target: number; filled: number }) {
  // normalizeDesign deja solo colores #RRGGBB y URLs http(s): el SVG se arma con valores seguros.
  const svg = useMemo(() => {
    const safe = normalizeDesign(design);
    return renderStampStripSvg(safe, target, filled, {
      hero: safe.heroImageUrl,
      empty: safe.stampEmptyImageUrl,
      filled: safe.stampFilledImageUrl,
    });
  }, [design, target, filled]);
  return (
    <div
      role="img"
      aria-label={`${filled} de ${target} sellos`}
      className="[&>svg]:w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function Logo({ design, size }: { design: CardDesign; size: string }) {
  if (design.logoUrl) {
    return <img src={design.logoUrl} alt="" className={`${size} rounded-full object-cover bg-white`} />;
  }
  return (
    <span className={`${size} rounded-full flex items-center justify-center`} style={{ backgroundColor: design.backgroundColor, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)' }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="w-1/2 h-1/2" fill={autoTextColor(design.backgroundColor)}>
        <path d={STAMP_ICON_PATHS[design.stampIcon]} />
      </svg>
    </span>
  );
}

/** Pase de Google Wallet: título, fila del frente, imagen destacada, QR y detalle. */
function AndroidPass({ config, brandName, face }: { config: CardConfig; brandName: string; face: Face }) {
  const { design, details } = config;
  const text = autoTextColor(design.backgroundColor);
  const data = sample(config);
  const qr = useQr('fidelity-wallet-preview');
  const items = [{ key: 'balance', label: data.balanceLabel, value: data.balanceValue }, ...data.front];

  if (face === 'DETAILS') {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-3 px-5 py-4" style={{ backgroundColor: design.backgroundColor, color: text }}>
          <Logo design={design} size="w-9 h-9" />
          <span className="font-bold truncate">{config.name || 'Tu tarjeta'}</span>
        </div>
        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {details.showCustomerName && <DetailRow label="Titular" value={SAMPLE_NAME} />}
          <DetailRow label={data.balanceLabel} value={data.balanceValue} />
          {data.fields.map((f) => (
            <DetailRow key={f.key} label={f.label} value={f.value} />
          ))}
          {details.sections.map((s, i) => (
            <DetailRow key={`s-${i}`} label={s.header || 'Sección'} value={s.body || '…'} />
          ))}
        </dl>
        {(details.links.length > 0 || details.homepageUrl) && (
          <ul className="px-5 py-3 space-y-2 border-t border-slate-100 dark:border-slate-800">
            {details.homepageUrl && <LinkRow label="Sitio web" uri={details.homepageUrl} />}
            {details.links.map((link, i) => (
              <LinkRow key={i} label={link.label || 'Enlace'} uri={link.value ? linkUri(link) : ''} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl shadow-xl overflow-hidden" style={{ backgroundColor: design.backgroundColor, color: text }}>
      <div className="px-5 pt-5 flex items-center gap-3">
        {design.wideLogoUrl ? (
          <img src={design.wideLogoUrl} alt="" className="h-8 max-w-[70%] object-contain object-left" />
        ) : (
          <>
            <Logo design={design} size="w-9 h-9" />
            <span className="text-sm font-medium truncate">{brandName}</span>
          </>
        )}
      </div>
      <p className="px-5 pt-3 text-xl font-bold leading-tight break-words">{config.name || 'Tu tarjeta'}</p>
      <div className={`px-5 pt-4 pb-4 grid gap-3 ${items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {items.map((item) => (
          <div key={item.key} className="min-w-0">
            <p className="text-[11px] opacity-80 truncate">{item.label}</p>
            <p className="text-sm font-semibold truncate">{item.value}</p>
          </div>
        ))}
      </div>
      {config.type === 'STAMPS' ? (
        <StampStrip design={design} target={data.target} filled={data.balance} />
      ) : (
        design.heroImageUrl && <img src={design.heroImageUrl} alt="" className="w-full aspect-[1032/336] object-cover" />
      )}
      <div className="flex flex-col items-center gap-2 px-5 py-5">
        <div className="bg-white rounded-2xl p-3">
          {qr ? <img src={qr} alt="Código QR de ejemplo" className="w-32 h-32" /> : <div className="w-32 h-32" />}
        </div>
        {details.showCustomerName && <span className="text-xs opacity-90">{SAMPLE_NAME}</span>}
      </div>
      {details.homepageUrl && (
        <div className="px-5 pb-5">
          <span className="block text-center text-sm font-bold rounded-full py-2" style={{ boxShadow: `inset 0 0 0 1px ${text}55` }}>
            Sitio web
          </span>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium whitespace-pre-line break-words">{value}</dd>
    </div>
  );
}

function LinkRow({ label, uri }: { label: string; uri: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <svg aria-hidden="true" className="w-4 h-4 text-brand-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <span className="font-bold text-brand-blue">{label}</span>
      <span className="text-slate-400 truncate">{uri}</span>
    </li>
  );
}

/** Apple Wallet todavía no se emite de verdad: es una aproximación del storeCard. */
function ApplePass({ config, face }: { config: CardConfig; face: Face }) {
  const { design, details } = config;
  const data = sample(config);
  const qr = useQr('fidelity-wallet-preview');
  const label = { color: design.labelColor };
  const value = { color: design.textColor };

  if (face === 'DETAILS') {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-5 space-y-3 text-sm text-slate-900 dark:text-slate-100">
        {details.sections.map((s, i) => (
          <div key={i}>
            <p className="text-[11px] font-bold uppercase text-slate-500">{s.header || 'Sección'}</p>
            <p className="whitespace-pre-line">{s.body || '…'}</p>
          </div>
        ))}
        {details.links.map((link, i) => (
          <div key={`l-${i}`}>
            <p className="text-[11px] font-bold uppercase text-slate-500">{link.label || 'Enlace'}</p>
            <p className="text-brand-blue break-all">{link.value ? linkUri(link) : ''}</p>
          </div>
        ))}
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-500">Vigencia</p>
          <p>{config.stampValidityDays ? `Tus ${balanceUnit(config.type)} vencen ${config.stampValidityDays} días después de ganarlos.` : `Tus ${balanceUnit(config.type)} no vencen.`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: design.backgroundColor }}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {design.wideLogoUrl ? (
            <img src={design.wideLogoUrl} alt="" className="h-7 max-w-[160px] object-contain object-left" />
          ) : (
            <>
              <Logo design={design} size="w-7 h-7" />
              <span className="text-sm font-semibold truncate" style={value}>
                {config.name || 'Tu tarjeta'}
              </span>
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase" style={label}>
            {data.balanceLabel}
          </p>
          <p className="text-sm font-semibold" style={value}>
            {config.type === 'POINTS' ? data.balanceValue : `${data.balance} / ${data.target}`}
          </p>
        </div>
      </div>
      {config.type === 'STAMPS' ? (
        <StampStrip design={design} target={data.target} filled={data.balance} />
      ) : (
        design.heroImageUrl && <img src={design.heroImageUrl} alt="" className="w-full aspect-[1032/336] object-cover" />
      )}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {details.fields.includes('REWARD') && (
          <div>
            <p className="text-[10px] font-bold uppercase" style={label}>Premio</p>
            <p className="text-sm font-semibold truncate" style={value}>
              {data.fields.find((f) => f.key === 'REWARD')?.value}
            </p>
          </div>
        )}
        {details.showCustomerName && (
          <div>
            <p className="text-[10px] font-bold uppercase" style={label}>Titular</p>
            <p className="text-sm font-semibold" style={value}>{SAMPLE_NAME}</p>
          </div>
        )}
      </div>
      <div className="flex justify-center pb-5">
        <div className="bg-white rounded-xl p-2.5">
          {qr ? <img src={qr} alt="Código QR de ejemplo" className="w-28 h-28" /> : <div className="w-28 h-28" />}
        </div>
      </div>
    </div>
  );
}

export function CardPreview({ config, brandName, face }: { config: CardConfig; brandName: string; face: Face }) {
  const [platform, setPlatform] = useState<Platform>('ANDROID');

  return (
    <aside aria-label="Vista previa en vivo" className="rounded-2xl border border-panel-border bg-panel-soft overflow-hidden">
      <div className="px-5 py-4 bg-panel-surface border-b border-panel-border">
        <p className="font-extrabold text-panel-text">Vista previa en vivo</p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Se actualiza al editar
        </p>
      </div>
      <div className="p-5">
        <div role="tablist" aria-label="Billetera" className="flex justify-center gap-1 p-1 rounded-xl bg-panel-surface w-fit mx-auto mb-5">
          {(['ANDROID', 'APPLE'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={platform === p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold ${
                platform === p ? 'bg-panel-primary text-white' : 'text-panel-muted'
              }`}
            >
              {p === 'ANDROID' ? 'Google Wallet' : 'Apple Wallet'}
            </button>
          ))}
        </div>
        <div className="max-w-[320px] mx-auto">
          {platform === 'ANDROID' ? (
            <AndroidPass config={config} brandName={brandName} face={face} />
          ) : (
            <ApplePass config={config} face={face} />
          )}
        </div>
        <p className="text-xs text-center text-panel-muted mt-4">
          {platform === 'APPLE'
            ? 'Simulación: la emisión en Apple Wallet se habilitará más adelante.'
            : face === 'DETAILS'
              ? 'Así se ve el detalle del pase en Google Wallet.'
              : 'Datos de ejemplo. Google elige el color del texto según el fondo.'}
        </p>
      </div>
    </aside>
  );
}
