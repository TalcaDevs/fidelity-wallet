import { useSupport } from './hooks/useSupport';
import { SupportForm } from './components/support/SupportForm';
import { SupportContact } from './components/support/SupportContact';
import { SupportHistory } from './components/support/SupportHistory';

export function Support() {
  const { tickets, loading, submitTicket } = useSupport();

  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'soporte@fidelity.com';
  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '+56900000000';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Soporte</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">¿Necesitas ayuda? Cuéntanos tu problema y te asistiremos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SupportForm onSubmit={submitTicket} />
        </div>
        <SupportContact supportEmail={supportEmail} supportPhone={supportPhone} />
      </div>

      <SupportHistory tickets={tickets} loading={loading} />
    </div>
  );
}
