import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export function Dashboard({ session }: { session: any }) {
  // Real Data State
  const [activePasses, setActivePasses] = useState(0);
  const [stampsDelivered, setStampsDelivered] = useState(0);
  const [rewardsRedeemed, setRewardsRedeemed] = useState(0);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async (merchantId: string) => {
    try {
      // 1. Fetch Active Passes Count
      const { count: passesCount } = await supabase
        .from('Pass')
        .select('*', { count: 'exact', head: true })
        .eq('merchantId', merchantId);
      setActivePasses(passesCount || 0);

      // 2. Fetch Stamps Delivered (ScanType = STAMP_ADDED)
      const { count: stampsCount } = await supabase
        .from('Scan')
        .select('*', { count: 'exact', head: true })
        .eq('merchantId', merchantId)
        .eq('type', 'STAMP_ADDED');
      setStampsDelivered(stampsCount || 0);

      // 3. Fetch Rewards Redeemed (ScanType = REWARD_REDEEMED)
      const { count: rewardsCount } = await supabase
        .from('Scan')
        .select('*', { count: 'exact', head: true })
        .eq('merchantId', merchantId)
        .eq('type', 'REWARD_REDEEMED');
      setRewardsRedeemed(rewardsCount || 0);

      // 4. Fetch Recent Activity
      const { data: scans } = await supabase
        .from('Scan')
        .select('id, type, createdAt, pass:Pass(customer:Customer(rut, phone))')
        .eq('merchantId', merchantId)
        .order('createdAt', { ascending: false })
        .limit(5);

      setRecentScans(scans || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData(session.user.id);
    }
  }, [session, fetchDashboardData]);

  return (
    <>
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Bienvenido, {session?.user?.email || 'Local'}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Aquí tienes un resumen del rendimiento de tu programa de lealtad hoy.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Card 1 - Pases */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue dark:text-blue-400 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Pases Activos</h3>
          </div>
          <p className="text-6xl font-black mb-3 relative z-10 tracking-tight text-slate-900 dark:text-white">{activePasses}</p>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center relative z-10 bg-emerald-50 dark:bg-emerald-500/10 inline-flex px-3 py-1 rounded-full">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            Total acumulado
          </p>
        </div>

        {/* Card 2 - Sellos */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-brand-yellow/10 dark:bg-brand-yellow/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-yellow/10 dark:bg-brand-yellow/20 flex items-center justify-center text-brand-yellow shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Sellos Entregados</h3>
          </div>
          <p className="text-6xl font-black mb-3 relative z-10 tracking-tight text-slate-900 dark:text-white">{stampsDelivered}</p>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center relative z-10 bg-emerald-50 dark:bg-emerald-500/10 inline-flex px-3 py-1 rounded-full">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            Total acumulado
          </p>
        </div>

        {/* Card 3 - Premios */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-brand-orange/10 dark:bg-brand-orange/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 dark:bg-brand-orange/20 flex items-center justify-center text-brand-orange shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Premios Canjeados</h3>
          </div>
          <p className="text-6xl font-black mb-3 relative z-10 tracking-tight text-slate-900 dark:text-white">{rewardsRedeemed}</p>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center relative z-10 bg-slate-100 dark:bg-slate-700 inline-flex px-3 py-1 rounded-full">
            Total histórico
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-10 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          Actividad Reciente
          <span className="bg-brand-blue/10 text-brand-blue text-xs px-3 py-1 rounded-full font-bold">En vivo</span>
        </h2>
        <div className="space-y-4">
          {recentScans.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay actividad reciente.</p>
          ) : (
            recentScans.map((scan) => {
              const customer = scan.pass?.customer || {};
              const identifier = customer.rut || customer.phone || 'Anónimo';
              const isReward = scan.type === 'REWARD_REDEEMED';
              return (
                <div key={scan.id} className="flex items-center justify-between p-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isReward ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-blue/10 text-brand-blue'}`}>
                      {isReward ? '🎁' : 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{isReward ? 'Premio Canjeado' : 'Cliente escaneado'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{identifier}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${isReward ? 'bg-brand-orange/10 text-brand-orange' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`}>
                      {isReward ? 'Premio' : '+1 Sello'}
                    </span>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">
                      {new Date(scan.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
