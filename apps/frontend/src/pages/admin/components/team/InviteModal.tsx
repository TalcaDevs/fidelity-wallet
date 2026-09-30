import { useState } from 'react';

export function InviteModal({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, password?: string) => Promise<boolean>;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  if (!isOpen) return null;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSubmitting(true);
    setInviteError('');
    try {
      const success = await onInvite(inviteEmail, invitePassword);
      if (success) {
        setInviteEmail('');
        setInvitePassword('');
        onClose();
      }
    } catch (err: any) {
      setInviteError(err.message || 'Error al invitar personal');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
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
  );
}
