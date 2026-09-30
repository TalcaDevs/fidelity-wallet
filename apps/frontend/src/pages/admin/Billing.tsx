import { useState } from 'react';
import { CATALOG_PLANS } from '../../constants/plans';

export function Billing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const currentPlan = CATALOG_PLANS.find(p => p.id === 'TRIAL')!;

  // Mocked stats for progress bars
  const stats = [
    { label: 'Programas de Lealtad', used: 1, limit: currentPlan.limits.programs },
    { label: 'Clientes Registrados', used: 45, limit: currentPlan.limits.customers },
    { label: 'Sucursales', used: 1, limit: currentPlan.limits.locations },
    { label: 'Usuarios de Equipo', used: 1, limit: currentPlan.limits.teamUsers },
  ];

  // Mocked payment history
  const paymentHistory = [
    { id: 'FAC-001', date: '2026-09-01', plan: 'Gratis', amount: 0, status: 'Pagado' },
    { id: 'FAC-002', date: '2026-08-01', plan: 'Gratis', amount: 0, status: 'Pagado' },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Facturación y Planes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Administra tu suscripción y el uso de tu cuenta.</p>
      </div>

      {/* Uso del Plan Actual */}
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Tu plan actual</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{currentPlan.name}</span>
              <span className="text-slate-500 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg text-sm">Activo</span>
            </div>
          </div>
          <button disabled className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed">
            Cancelar Suscripción
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 relative z-10">Uso de tu plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {stats.map((stat, i) => {
            const limitVal = typeof stat.limit === 'number' ? stat.limit : Infinity;
            const percent = limitVal === Infinity ? 0 : Math.min(100, (stat.used / limitVal) * 100);
            const isNearLimit = percent >= 80;
            
            return (
              <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{stat.label}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {stat.used} <span className="text-slate-400 font-medium">de {stat.limit === null ? '∞' : stat.limit}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isNearLimit ? 'bg-orange-500' : 'bg-brand-blue'}`}
                    style={{ width: `${limitVal === Infinity ? 100 : percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Decoración */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Planes y Precios */}
      <div className="pt-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Mejora tu plan</h2>
          <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button 
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${!isAnnual ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Mensual
            </button>
            <button 
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isAnnual ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Anual
              <span className="bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">Ahorra 2 meses</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CATALOG_PLANS.filter(p => p.id !== 'TRIAL').map(plan => (
            <div key={plan.id} className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none flex flex-col hover:-translate-y-2 transition-transform duration-300">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  ${(isAnnual ? plan.priceUsdMonthlyAnnual : plan.priceUsdMonthly)?.toLocaleString('es-CL')}
                </span>
                <span className="text-slate-500 font-medium text-sm">
                  /{isAnnual ? 'año' : 'mes'}
                </span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {plan.limits.programs} Programas de lealtad
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {plan.limits.locations} Sucursales
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {plan.limits.teamUsers} Usuarios de equipo
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {plan.limits.customers === null ? 'Clientes ilimitados' : `${plan.limits.customers} Clientes`}
                  </span>
                </li>
              </ul>
              
              <button disabled className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed">
                Elegir {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Historial de Pagos */}
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Historial de pagos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="pb-4 pl-4 font-bold">Fecha</th>
                <th className="pb-4 font-bold">Plan</th>
                <th className="pb-4 font-bold">Monto</th>
                <th className="pb-4 font-bold">Estado</th>
                <th className="pb-4 pr-4 font-bold text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {paymentHistory.map(payment => (
                <tr key={payment.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-4 pl-4 rounded-l-xl text-slate-900 dark:text-white font-medium">{payment.date}</td>
                  <td className="py-4 text-slate-600 dark:text-slate-300 font-bold">{payment.plan}</td>
                  <td className="py-4 text-slate-600 dark:text-slate-300">${payment.amount}</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4 rounded-r-xl text-right">
                    <button 
                      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold text-brand-blue bg-brand-blue/10 hover:bg-brand-blue hover:text-white transition-all"
                      title="Descargar recibo"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
