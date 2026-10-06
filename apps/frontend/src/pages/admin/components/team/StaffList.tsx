import type { StaffMemberDto, StaffStatus } from '@fidelity/shared';
import { formatDate } from '../../../../lib/formatDate';

const STATUS_BADGE: Record<StaffStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Activo',
    className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  },
  INVITED: {
    label: 'Invitado',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  },
};

export interface StaffActions {
  onViewActivity: (member: StaffMemberDto) => void;
  onReassign: (member: StaffMemberDto) => void;
  onResendInvite: (member: StaffMemberDto) => void;
  onRemove: (member: StaffMemberDto) => void;
}

const ACTION_CLASSES =
  'whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold text-panel-muted bg-panel-soft hover:bg-panel-accent/10 hover:text-panel-accent transition-colors';

function StatusBadge({ status }: { status: StaffStatus }) {
  const badge = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function MemberIdentity({ member }: { member: StaffMemberDto }) {
  const email = member.email ?? 'Cuenta no disponible';
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-full bg-panel-soft flex items-center justify-center text-panel-muted font-bold shrink-0">
        {email.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-panel-text truncate">{email}</p>
        {member.role === 'OWNER' && (
          <span className="text-xs text-panel-accent bg-panel-accent/10 px-2 py-0.5 rounded-md mt-1 inline-block">Dueño</span>
        )}
      </div>
    </div>
  );
}

function MemberActions({ member, actions, align = 'start' }: { member: StaffMemberDto; actions: StaffActions; align?: 'start' | 'end' }) {
  return (
    <div className={`flex gap-2 ${align === 'end' ? 'justify-end flex-nowrap' : 'flex-wrap'}`}>
      <button type="button" className={ACTION_CLASSES} onClick={() => actions.onViewActivity(member)}>
        Actividad
      </button>
      {member.role === 'STAFF' && (
        <>
          <button type="button" className={ACTION_CLASSES} onClick={() => actions.onReassign(member)}>
            Cambiar local
          </button>
          {member.canResendInvite && (
            <button type="button" className={ACTION_CLASSES} onClick={() => actions.onResendInvite(member)}>
              Reenviar invitación
            </button>
          )}
          <button
            type="button"
            className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            onClick={() => actions.onRemove(member)}
          >
            Dar de baja
          </button>
        </>
      )}
    </div>
  );
}

const lastSignIn = (member: StaffMemberDto) =>
  member.lastSignInAt ? formatDate(member.lastSignInAt) : 'Nunca';

/** Tabla en pantallas anchas y tarjetas en el resto (§6.4): con el menú lateral, la tabla no cabe antes de xl. */
export function StaffList({ staff, actions }: { staff: StaffMemberDto[]; actions: StaffActions }) {
  return (
    <>
      <ul className="xl:hidden grid gap-3 md:grid-cols-2">
        {staff.map((member) => (
          <li key={member.userId} className="rounded-2xl border border-panel-border p-4 space-y-3">
            <MemberIdentity member={member} />
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-panel-muted">Local</dt>
              <dd className="text-panel-text font-medium">{member.locationName ?? 'Todos los locales'}</dd>
              <dt className="text-panel-muted">Estado</dt>
              <dd><StatusBadge status={member.status} /></dd>
              <dt className="text-panel-muted">Último ingreso</dt>
              <dd className="text-panel-text font-medium">{lastSignIn(member)}</dd>
            </dl>
            <MemberActions member={member} actions={actions} />
          </li>
        ))}
      </ul>

      <div className="hidden xl:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-panel-border text-panel-muted text-sm">
              <th className="pb-4 pl-4 font-bold">Usuario</th>
              <th className="pb-4 px-4 font-bold">Local</th>
              <th className="pb-4 px-4 font-bold">Estado</th>
              <th className="pb-4 px-4 font-bold whitespace-nowrap">Último ingreso</th>
              <th className="pb-4 pr-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {staff.map((member) => (
              <tr key={member.userId} className="hover:bg-panel-soft transition-colors">
                <td className="py-4 pl-4 max-w-[260px]"><MemberIdentity member={member} /></td>
                <td className="py-4 px-4 text-panel-text">{member.locationName ?? 'Todos los locales'}</td>
                <td className="py-4 px-4"><StatusBadge status={member.status} /></td>
                <td className="py-4 px-4 text-sm text-panel-muted whitespace-nowrap">{lastSignIn(member)}</td>
                <td className="py-4 pr-4"><MemberActions member={member} actions={actions} align="end" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
