import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlan, type StaffMemberDto } from '@fidelity/shared';
import { ROUTES } from '../../components/routing/routePaths';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useBrandLocations } from '../../hooks/useBrandLocations';
import { useSubscription } from '../../hooks/useSubscription';
import { useTeam } from '../../hooks/useTeam';
import { ActivitySidebar } from './components/team/ActivitySidebar';
import { InviteModal } from './components/team/InviteModal';
import { ReassignModal } from './components/team/ReassignModal';
import { StaffList } from './components/team/StaffList';

type Dialog =
  | { kind: 'invite' }
  | { kind: 'activity'; member: StaffMemberDto }
  | { kind: 'reassign'; member: StaffMemberDto }
  | { kind: 'remove'; member: StaffMemberDto }
  | null;

export function Team({ brandId }: { brandId: string | null }) {
  const team = useTeam(brandId);
  const { locations } = useBrandLocations(brandId);
  const { subscription } = useSubscription(brandId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const close = () => setDialog(null);

  // "N de M usuarios" (§6.4). El backend todavía no bloquea el límite (§8.11): solo se avisa.
  const teamLimit = subscription ? getPlan(subscription.planId).limits.teamUsers : null;
  const teamUsers = team.staff.filter((m) => m.role === 'STAFF').length;
  const atLimit = teamLimit !== null && teamUsers >= teamLimit;
  const overLimit = teamLimit !== null && teamUsers > teamLimit;

  async function handleRemove(member: StaffMemberDto) {
    setIsRemoving(true);
    const ok = await team.removeStaff(member.userId);
    setIsRemoving(false);
    if (ok) close();
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Equipo</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Administra el acceso de tus cajeros y meseros.</p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ kind: 'invite' })}
          className="px-6 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-brand-blue/30"
        >
          Agregar usuario
        </button>
      </div>

      <aside className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-brand-blue to-blue-700 rounded-3xl px-6 py-5 text-white shadow-xl shadow-brand-blue/30">
        <div>
          <h2 className="text-lg font-bold">Acceso al escáner</h2>
          <p className="text-blue-100 text-sm">Tu equipo entra al escáner desde cualquier navegador con su correo y contraseña.</p>
        </div>
        <Link to={ROUTES.scan} className="shrink-0 bg-black/20 hover:bg-black/40 transition-colors px-5 py-3 rounded-xl text-sm font-bold text-center">
          Abrir escáner web
        </Link>
      </aside>

      <section className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Usuarios</h2>
          {teamLimit !== null && (
            <p className={`text-sm font-bold ${atLimit ? 'text-orange-600' : 'text-slate-500'}`}>
              {teamUsers} de {teamLimit} usuarios de equipo
              {overLimit ? ' · superaste el límite de tu plan' : atLimit ? ' · llegaste al límite de tu plan' : ''}
            </p>
          )}
        </div>

        {team.error ? (
          <ErrorAlert message={team.error} />
        ) : team.loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl" />
            ))}
          </div>
        ) : (
          <StaffList
            staff={team.staff}
            actions={{
              onViewActivity: (member) => setDialog({ kind: 'activity', member }),
              onReassign: (member) => setDialog({ kind: 'reassign', member }),
              onResendInvite: (member) => void team.resendInvite(member.userId),
              onRemove: (member) => setDialog({ kind: 'remove', member }),
            }}
          />
        )}
      </section>


      {dialog?.kind === 'invite' && (
        <InviteModal locations={locations} onClose={close} onInvite={team.inviteStaff} />
      )}
      {dialog?.kind === 'activity' && (
        <ActivitySidebar key={dialog.member.userId} member={dialog.member} onClose={close} onLoadActivity={team.getActivity} />
      )}
      {dialog?.kind === 'reassign' && (
        <ReassignModal
          member={dialog.member}
          locations={locations}
          onClose={close}
          onReassign={(locationId) => team.reassignStaff(dialog.member.userId, locationId)}
        />
      )}
      {dialog?.kind === 'remove' && (
        <ConfirmDialog
          title="¿Dar de baja?"
          message={`${dialog.member.email ?? 'Este usuario'} pierde el acceso al escáner de inmediato.`}
          confirmLabel="Dar de baja"
          tone="danger"
          isBusy={isRemoving}
          onConfirm={() => void handleRemove(dialog.member)}
          onCancel={close}
        />
      )}
    </div>
  );
}
