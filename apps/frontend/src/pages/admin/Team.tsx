import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMembership } from '../../hooks/useMembership';
import { authenticatedFetch } from '../../lib/api';
import { Link } from 'react-router-dom';

interface StaffMember {
  id: string;
  email: string;
  role: string;
  status: 'INVITED' | 'ACTIVE';
  lastSignIn: string | null;
  createdAt: string;
}

interface ScanActivity {
  id: string;
  type: 'STAMP_ADDED' | 'REWARD_REDEEMED';
  method: 'QR' | 'MANUAL';
  createdAt: string;
  customerPhone: string;
  promotionName: string | null;
}

export function Team() {
  const { session } = useAuth();
  const membership = useMembership(session);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [viewingUser, setViewingUser] = useState<StaffMember | null>(null);
  const [activity, setActivity] = useState<ScanActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [userToDelete, setUserToDelete] = useState<StaffMember | null>(null);
  
  const [userToEdit, setUserToEdit] = useState<StaffMember | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (membership.merchantId) {
      loadStaff();
    }
  }, [membership.merchantId]);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/merchants/${membership.merchantId}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error('Error cargando personal', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSubmitting(true);
    setInviteError('');
    try {
      const res = await authenticatedFetch(`/merchants/${membership.merchantId}/staff/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, password: invitePassword || undefined })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al invitar personal');
      }

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInvitePassword('');
      await loadStaff();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmRemove(user: StaffMember) {
    setUserToDelete(user);
  }

  async function handleRemove() {
    if (!userToDelete) return;
    
    try {
      const res = await authenticatedFetch(`/merchants/${membership.merchantId}/staff/${userToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStaff(prev => prev.filter(s => s.id !== userToDelete.id));
      }
    } catch (err) {
      console.error('Error eliminando personal', err);
    } finally {
      setUserToDelete(null);
    }
  }

  function openEdit(user: StaffMember) {
    setUserToEdit(user);
    setEditPassword('');
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userToEdit || !editPassword || editPassword.length < 6) return;

    setIsEditing(true);
    try {
      const res = await authenticatedFetch(`/merchants/${membership.merchantId}/staff/${userToEdit.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: editPassword })
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Error al actualizar contraseña');
        return;
      }
      
      alert('Contraseña actualizada correctamente');
      setUserToEdit(null);
    } catch (err) {
      console.error('Error editando personal', err);
    } finally {
      setIsEditing(false);
    }
  }

  async function handleViewActivity(user: StaffMember) {
    setViewingUser(user);
    setLoadingActivity(true);
    try {
      const res = await authenticatedFetch(`/merchants/${membership.merchantId}/staff/${user.id}/scans`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data);
      }
    } catch (err) {
      console.error('Error cargando actividad', err);
    } finally {
      setLoadingActivity(false);
    }
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
                      <tr key={user.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
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
                              Ingreso: {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 rounded-r-xl">
                          <div className="flex items-center justify-center gap-2 transition-opacity">
                            <button 
                              onClick={() => handleViewActivity(user)}
                              title="Ver actividad"
                              className="p-2 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {user.role !== 'OWNER' && (
                              <>
                                <button 
                                  onClick={() => openEdit(user)}
                                  title="Editar"
                                  className="p-2 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button 
                                  onClick={() => confirmRemove(user)}
                                  title="Eliminar"
                                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </>
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

      {/* Modal de Invitación */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Agregar Usuario</h2>
            <p className="text-slate-500 mb-6">Ingresa el correo del operador. Puedes asignarle una contraseña inicial temporal.</p>

            {inviteError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Correo electrónico</label>
                <input 
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contraseña (Opcional)</label>
                <input 
                  type="password"
                  value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)}
                  placeholder="Dejar en blanco para enviar invitación"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting || !inviteEmail}
                  className="w-full py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : (invitePassword ? 'Crear Cuenta' : 'Enviar Invitación')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Panel lateral de Actividad */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Actividad Reciente</h2>
                <p className="text-sm text-slate-500">{viewingUser.email}</p>
              </div>
              <button 
                onClick={() => setViewingUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingActivity ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-slate-500 font-medium">No hay actividad registrada para este usuario.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activity.map(scan => (
                    <div key={scan.id} className="flex gap-4 relative">
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center shadow-sm z-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700">
                        {scan.type === 'STAMP_ADDED' ? (
                          <svg className="w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        ) : (
                          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {scan.type === 'STAMP_ADDED' ? 'Sello Entregado' : 'Premio Canjeado'}
                          </p>
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {new Date(scan.createdAt).toLocaleDateString()} {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Cliente: <span className="font-medium">{scan.customerPhone}</span>
                        </p>
                        {scan.promotionName && (
                          <p className="text-sm text-slate-500 mt-0.5">
                            Premio: {scan.promotionName}
                          </p>
                        )}
                        <span className="inline-block mt-2 text-[10px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          Vía {scan.method}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmar Eliminar */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¿Dar de baja?</h2>
            <p className="text-slate-500 text-sm mb-6">
              Esta acción eliminará el acceso de <span className="font-bold text-slate-700 dark:text-slate-300">{userToDelete.email}</span> de forma permanente a tu comercio.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRemove}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Contraseña */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setUserToEdit(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Actualizar Contraseña</h2>
            <p className="text-slate-500 mb-6">Ingresa una nueva contraseña para <span className="font-bold">{userToEdit.email}</span>.</p>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nueva Contraseña</label>
                <input 
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isEditing || editPassword.length < 6}
                  className="w-full py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50"
                >
                  {isEditing ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
