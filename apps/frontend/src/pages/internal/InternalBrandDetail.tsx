import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CATALOG_PLANS,
  getPlan,
  type InternalBrandDetailDto,
  type LocationDto,
  type LocationInput,
  type PlanId,
  type PlanUsage,
} from '@fidelity/shared';
import { LocationForm } from '../../components/locations/LocationForm';
import { LocationMap, type MapPin } from '../../components/map/LocationMap';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Modal } from '../../components/ui/Modal';
import { errorMessage, useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatDateTime } from '../../lib/formatDate';
import { getBrand, updateBrand, updateLocationInternal } from '../../services/internalService';
import { useIsSuperadmin } from './internalRole';
import { BrandStatusBadge, CARD, INPUT, PRIMARY, PageHeader, PlanBadge, SECONDARY } from './ui';

const USAGE_LABELS: Record<keyof PlanUsage, string> = {
  programs: 'Programas activos',
  locations: 'Sucursales',
  teamUsers: 'Usuarios de equipo',
  customers: 'Clientes',
};

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={`${CARD} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function UsageBars({ brand }: { brand: InternalBrandDetailDto }) {
  const { limits } = getPlan(brand.subscription.planId);
  return (
    <ul className="space-y-3">
      {(Object.keys(USAGE_LABELS) as (keyof PlanUsage)[]).map((key) => {
        const used = brand.subscription.usage[key];
        const limit = limits[key];
        const pct = limit === null ? 0 : Math.min(100, (used / limit) * 100);
        const over = limit !== null && used > limit;
        return (
          <li key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span>{USAGE_LABELS[key]}</span>
              <span className={`font-bold ${over ? 'text-red-600' : ''}`}>{used} / {limit ?? '∞'}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div className={`h-full ${over ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${limit === null ? 0 : pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AccountEditor({ brand, onSaved }: { brand: InternalBrandDetailDto; onSaved: (b: InternalBrandDetailDto) => void }) {
  const { notifySuccess } = useToast();
  const [planId, setPlanId] = useState<PlanId>(brand.planId);
  const [trialEndsAt, setTrialEndsAt] = useState(brand.trialEndsAt.slice(0, 10));
  const [name, setName] = useState(brand.name);
  const [legalName, setLegalName] = useState(brand.legalName ?? '');
  const [taxId, setTaxId] = useState(brand.taxId ?? '');
  const [contactEmail, setContactEmail] = useState(brand.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(brand.contactPhone ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);

  const orNull = (v: string) => v.trim() || null;

  async function save(input: Parameters<typeof updateBrand>[1], message: string) {
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateBrand(brand.id, input));
      notifySuccess(message);
      setReason('');
      setConfirmStatus(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save(
      {
        name: name.trim(),
        legalName: orNull(legalName),
        taxId: orNull(taxId),
        contactEmail: orNull(contactEmail),
        contactPhone: orNull(contactPhone),
        planId,
        trialEndsAt:
          trialEndsAt !== brand.trialEndsAt.slice(0, 10)
            ? new Date(`${trialEndsAt}T23:59:59`).toISOString()
            : undefined,
        reason: reason.trim() || undefined,
      },
      'Marca actualizada',
    );
  }

  const suspending = brand.status === 'ACTIVE';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold space-y-1">
          <span>Plan</span>
          <select value={planId} onChange={(e) => setPlanId(e.target.value as PlanId)} className={`${INPUT} w-full`}>
            {CATALOG_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}{p.priceUsdMonthly ? ` · USD ${p.priceUsdMonthly}` : ''}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold space-y-1">
          <span>Fin de la prueba</span>
          <input type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} className={`${INPUT} w-full`} disabled={planId !== 'TRIAL'} />
        </label>
        <label className="text-sm font-bold space-y-1 sm:col-span-2">
          <span>Nombre de la marca</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} w-full`} required minLength={2} />
        </label>
        <label className="text-sm font-bold space-y-1">
          <span>Razón social</span>
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={`${INPUT} w-full`} />
        </label>
        <label className="text-sm font-bold space-y-1">
          <span>RUT empresa</span>
          <input value={taxId} onChange={(e) => setTaxId(e.target.value)} className={`${INPUT} w-full`} />
        </label>
        <label className="text-sm font-bold space-y-1">
          <span>Correo de contacto</span>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={`${INPUT} w-full`} />
        </label>
        <label className="text-sm font-bold space-y-1">
          <span>Teléfono de contacto</span>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={`${INPUT} w-full`} placeholder="+56912345678" />
        </label>
        <label className="text-sm font-bold space-y-1 sm:col-span-2">
          <span>Motivo del cambio (queda en la auditoría)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${INPUT} w-full`} placeholder="Ej.: piloto acordado por correo" />
        </label>
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" onClick={() => setConfirmStatus(true)} className={`${SECONDARY} ${suspending ? 'text-red-600' : 'text-green-700'}`}>
          {suspending ? 'Suspender marca' : 'Reactivar marca'}
        </button>
        <button type="submit" disabled={saving} className={PRIMARY}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>

      {confirmStatus && (
        <Modal
          title={suspending ? '¿Suspender la marca?' : '¿Reactivar la marca?'}
          description={
            suspending
              ? 'El dueño y los meseros pierden el acceso, /join deja de funcionar y no se sella ni se canjea. Los datos se conservan (HANDOFF §8.12).'
              : 'La marca vuelve a operar con normalidad.'
          }
          onClose={() => setConfirmStatus(false)}
        >
          <div className="space-y-3">
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${INPUT} w-full`} placeholder="Motivo (obligatorio)" />
            <div className="flex justify-end gap-2">
              <button type="button" className={SECONDARY} onClick={() => setConfirmStatus(false)}>Cancelar</button>
              <button
                type="button"
                disabled={saving || reason.trim().length < 3}
                className={suspending ? `${PRIMARY} bg-red-600 hover:bg-red-700` : PRIMARY}
                onClick={() => void save({ status: suspending ? 'SUSPENDED' : 'ACTIVE', reason: reason.trim() }, suspending ? 'Marca suspendida' : 'Marca reactivada')}
              >
                {suspending ? 'Suspender' : 'Reactivar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}

export function InternalBrandDetail() {
  const { brandId } = useParams<{ brandId: string }>();
  const isSuperadmin = useIsSuperadmin();
  const { notifySuccess } = useToast();
  const fetcher = useCallback(() => getBrand(brandId!), [brandId]);
  const { data: brand, loading, error, setData } = useAsyncData(brandId ? fetcher : null);
  const [editingLocation, setEditingLocation] = useState<LocationDto | null>(null);

  const pins = useMemo<MapPin[]>(
    () =>
      (brand?.locationsList ?? [])
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({ id: l.id, latitude: l.latitude!, longitude: l.longitude!, label: l.name, detail: [l.address, l.commune].filter(Boolean).join(', '), muted: !l.isActive })),
    [brand],
  );

  if (loading && !brand) return <div className={`${CARD} h-96 animate-pulse`} />;
  if (error || !brand) return <ErrorAlert message={error ?? 'No se pudo cargar la marca'} />;

  async function saveLocation(input: LocationInput) {
    if (!editingLocation) return;
    const saved = await updateLocationInternal(editingLocation.id, input);
    setData((prev) => (prev ? { ...prev, locationsList: prev.locationsList.map((l) => (l.id === saved.id ? saved : l)) } : prev));
    setEditingLocation(null);
    notifySuccess('Local actualizado');
  }

  const sub = brand.subscription;

  return (
    <div className="space-y-6">
      <Link to="/internal/brands" className="text-sm font-bold text-violet-600 hover:underline">← Marcas</Link>
      <PageHeader
        title={brand.name}
        subtitle={`${brand.ownerEmail ?? 'Sin dueño'} · alta ${formatDate(brand.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BrandStatusBadge status={brand.status} />
            <PlanBadge planId={brand.planId} />
            <Link to={`/internal/tickets?brandId=${brand.id}`} className={SECONDARY}>Tickets ({brand.openTickets} abiertos)</Link>
            <Link to={`/internal/customers?brandId=${brand.id}`} className={SECONDARY}>Clientes ({brand.customers})</Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Section title={`Locales (${brand.locationsList.length})`}>
            <LocationMap pins={pins} className="h-64 mb-4" />
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {brand.locationsList.map((l) => (
                <li key={l.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{l.name} {!l.isActive && <span className="text-xs text-slate-500">(inactivo)</span>}</p>
                    <p className="text-xs text-slate-500">/join/{l.slug} · {[l.address, l.commune, l.region].filter(Boolean).join(', ') || 'sin dirección'}{l.phone ? ` · ${l.phone}` : ''}{l.contactName ? ` · ${l.contactName}` : ''}</p>
                  </div>
                  {isSuperadmin && <button type="button" className={SECONDARY} onClick={() => setEditingLocation(l)}>Editar</button>}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Programas y promociones">
            {brand.programs.map((p) => (
              <div key={p.id} className="mb-4 last:mb-0">
                <p className="font-bold">{p.name} <span className="text-xs text-slate-500">· {p.stampValidityDays ? `sellos vencen a los ${p.stampValidityDays} días` : 'sellos sin vencimiento'}{p.isActive ? '' : ' · inactivo'}</span></p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {p.promotions.map((pr) => (
                    <li key={pr.id} className={`rounded-xl p-3 text-sm bg-slate-50 dark:bg-slate-900/60 ${pr.isActive ? '' : 'opacity-60'}`}>
                      <span className="font-bold">{pr.name}</span> · {pr.targetStamps} sellos → {pr.rewardName}
                    </li>
                  ))}
                  {p.promotions.length === 0 && <li className="text-sm text-slate-500">Sin promociones</li>}
                </ul>
              </div>
            ))}
          </Section>

          <Section title="Actividad reciente">
            {brand.recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">Todavía no hay escaneos.</p>
            ) : (
              <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-700/60">
                {brand.recentActivity.map((a) => (
                  <li key={a.id} className="py-2 flex flex-wrap justify-between gap-2">
                    <span>{a.type === 'STAMP_ADDED' ? 'Sello' : 'Canje'} · {a.customer} · {a.locationName} <span className="text-xs text-slate-500">({a.method === 'QR' ? 'QR' : a.method === 'PANEL' ? 'panel' : 'manual'})</span></span>
                    <span className="text-slate-500 whitespace-nowrap">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Plan y uso">
            <p className="text-sm mb-4">
              {sub.status === 'TRIALING' && `Prueba hasta el ${formatDate(sub.trialEndsAt!)}`}
              {sub.status === 'PAST_DUE' && <span className="font-bold text-orange-600">Prueba vencida el {formatDate(sub.trialEndsAt!)}</span>}
              {sub.status === 'ACTIVE' && `Plan ${getPlan(sub.planId).name} activo`}
            </p>
            <UsageBars brand={brand} />
          </Section>

          {isSuperadmin && (
            <Section title="Cuenta">
              <AccountEditor key={`${brand.planId}-${brand.status}`} brand={brand} onSaved={(b) => setData(() => b)} />
            </Section>
          )}

          <Section title={`Equipo (${brand.members.length})`}>
            <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-700/60">
              {brand.members.map((m) => (
                <li key={m.userId} className="py-2">
                  <p className="font-bold truncate">{m.email ?? m.userId}</p>
                  <p className="text-xs text-slate-500">{m.role === 'OWNER' ? 'Dueño' : `Mesero · ${m.locationName ?? '—'}`} · último ingreso {m.lastSignInAt ? formatDate(m.lastSignInAt) : 'nunca'}</p>
                </li>
              ))}
            </ul>
          </Section>

          {!isSuperadmin && (
            <p className="text-xs text-slate-500">Editar la cuenta, el plan o los locales requiere rol Superadmin.</p>
          )}
        </div>
      </div>

      {editingLocation && (
        <Modal size="lg" title={`Editar ${editingLocation.name}`} description="El cambio queda en la auditoría." onClose={() => setEditingLocation(null)}>
          <LocationForm location={editingLocation} submitLabel="Guardar" onSubmit={saveLocation} onCancel={() => setEditingLocation(null)} />
        </Modal>
      )}
    </div>
  );
}
