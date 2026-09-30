import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../hooks/useMembership';
import { Link } from 'react-router-dom';
import { useTeam, type StaffMember } from './hooks/useTeam';
import { InviteModal } from './components/team/InviteModal';
import { ActivitySidebar } from './components/team/ActivitySidebar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export function Team() {
  const { session } = useAuth();
  const membership = useMembership(session);
  const { staff, loading, loadStaff, removeStaff, inviteStaff, getActivity } = useTeam(membership.merchantId);
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<StaffMember | null>(null);
  const [userToDelete, setUserToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (membership.merchantId) {
      loadStaff();
    }
  }, [membership.merchantId, loadStaff]);

  async function handleRemove() {
    if (!userToDelete) return;
    setIsDeleting(true);
    const success = await removeStaff(userToDelete.userId);
    if (success) {
      setUserToDelete(null);
    }
    setIsDeleting(false);
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Equipo</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Administra el acceso de tus cajeros y meseros.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-brand-blue/30 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          Agregar Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Operadores Activos</h2>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl" />
                ))}
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 font-medium mb-4">No tienes usuarios en tu equipo.</p>
                <button onClick={() => setIsInviteModalOpen(true)} className="text-brand-blue font-bold hover:underline">
                  Invita a tu primer operador
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                      <th className="pb-4 pl-4 font-bold">Usuario</th>
                      <th className="pb-4 font-bold">Estado</th>
                      <th className="pb-4 pr-4 font-bold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {staff.map(user => (
                      <tr key={user.userId} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-4 pl-4 rounded-l-xl font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold shrink-0">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p>{user.email}</p>
                              {user.role === 'OWNER' && <span className="text-xs text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md mt-1 inline-block">Dueño</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col items-start">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              user.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' 
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            }`}>
                              {user.status === 'ACTIVE' ? 'Activo' : 'Invitado'}
                            </span>
                            <span className="text-xs text-slate-400 mt-1">
                              Ingreso: {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 rounded-r-xl">
                          <div className="flex items-center justify-center gap-2 transition-opacity">
                            <button 
                              onClick={() => setViewingUser(user)}
                              title="Ver actividad"
                              className="p-2 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {user.role !== 'OWNER' && (
                              <button 
                                onClick={() => setUserToDelete(user)}
                                title="Eliminar"
                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-brand-blue to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-brand-blue/30 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Acceso al Escáner</h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Tu equipo puede acceder al escáner descargando la app o desde cualquier navegador web.
              </p>
              
              <div className="space-y-3">
                <Link 
                  to="/scan"
                  className="bg-black/20 hover:bg-black/40 backdrop-blur-md transition-colors px-5 py-3 rounded-xl text-sm font-bold w-full text-center flex items-center justify-center gap-2 group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Abrir Escáner Web
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          </div>
        </div>
      </div>

      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={inviteStaff}
      />

      <ActivitySidebar 
        user={viewingUser}
        onClose={() => setViewingUser(null)}
        onLoadActivity={getActivity}
      />

      {userToDelete && (
        <ConfirmDialog
          title="¿Dar de baja?"
          message={`Esta acción eliminará el acceso de ${userToDelete.email} de forma permanente a tu comercio.`}
          confirmLabel="Sí, Eliminar"
          tone="danger"
          isBusy={isDeleting}
          onConfirm={handleRemove}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
}
