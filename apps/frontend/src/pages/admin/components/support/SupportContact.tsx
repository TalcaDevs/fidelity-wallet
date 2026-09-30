export function SupportContact({
  supportEmail,
  supportPhone,
}: {
  supportEmail: string;
  supportPhone: string;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Otras formas de contacto</h2>
        <div className="space-y-5">
          <a href={`https://wa.me/${supportPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="block group">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 group-hover:border-[#25D366]/50 group-hover:shadow-lg group-hover:shadow-[#25D366]/10 transition-all">
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">WhatsApp</h3>
                <p className="text-sm text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">Respuesta más rápida</p>
              </div>
            </div>
          </a>

          <a href={`mailto:${supportEmail}`} className="block group">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 group-hover:border-brand-blue/50 group-hover:shadow-lg group-hover:shadow-brand-blue/10 transition-all">
              <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Correo</h3>
                <p className="text-sm text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">Para temas detallados</p>
              </div>
            </div>
          </a>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-brand-blue/30 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-2">Estamos para ayudarte</h2>
          <p className="text-blue-100 text-sm leading-relaxed mb-6">
            Nuestro equipo de soporte está disponible de Lunes a Viernes, de 9:00 a 18:00 hrs. Haremos lo posible por responderte el mismo día.
          </p>
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors px-5 py-2.5 rounded-xl text-sm font-bold w-full text-center">
            Ver Centro de Ayuda
          </button>
        </div>
        {/* Decoración */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
      </div>
    </div>
  );
}
