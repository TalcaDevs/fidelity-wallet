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
  'px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-brand-blue/10 hover:text-brand-blue transition-colors';

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
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
        {email.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-slate-900 dark:text-white truncate">{email}</p>
        {member.role === 'OWNER' && (
          <span className="text-xs text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md mt-1 inline-block">Dueño</span>
        )}
      </div>
    </div>
  );
}

function MemberActions({ member, actions }: { member: StaffMemberDto; actions: StaffActions }) {
  return (
    <div className="flex flex-wrap gap-2">
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
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
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

/** Tabla en escritorio y tarjetas en móvil (§6.4). */
export function StaffList({ staff, actions }: { staff: StaffMemberDto[]; actions: StaffActions }) {
  return (
    <>
      <ul className="md:hidden space-y-3">
        {staff.map((member) => (
          <li key={member.userId} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <MemberIdentity member={member} />
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Local</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{member.locationName ?? 'Todos'}</dd>
              <dt className="text-slate-500">Estado</dt>
              <dd><StatusBadge status={member.status} /></dd>
              <dt className="text-slate-500">Último ingreso</dt>
              <dd className="text-slate-900 dark:text-white font-medium">{lastSignIn(member)}</dd>
            </dl>
            <MemberActions member={member} actions={actions} />
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
              <th className="pb-4 pl-4 font-bold">Correo</th>
              <th className="pb-4 font-bold">Local</th>
              <th className="pb-4 font-bold">Estado</th>
              <th className="pb-4 font-bold">Último ingreso</th>
              <th className="pb-4 pr-4 font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {staff.map((member) => (
              <tr key={member.userId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="py-4 pl-4 max-w-xs"><MemberIdentity member={member} /></td>
                <td className="py-4 text-slate-700 dark:text-slate-300">{member.locationName ?? 'Todos'}</td>
                <td className="py-4"><StatusBadge status={member.status} /></td>
                <td className="py-4 text-sm text-slate-500">{lastSignIn(member)}</td>
                <td className="py-4 pr-4"><MemberActions member={member} actions={actions} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
