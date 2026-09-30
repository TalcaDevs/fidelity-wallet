const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined;

const CHANNEL_CLASSES =
  'flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-blue/50 transition-all';

/** Sin variable de entorno el canal no se muestra: nunca un contacto de relleno (§6.5). */
export function SupportContact() {
  const whatsappDigits = SUPPORT_WHATSAPP?.replace(/\D/g, '');

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-br from-brand-blue to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-brand-blue/30">
        <h2 className="text-xl font-bold mb-2">Estamos para ayudarte</h2>
        <p className="text-blue-100 text-sm leading-relaxed">
          Tu mensaje llega directo a una persona de nuestro equipo. Te respondemos en esta misma pantalla.
        </p>
      </section>

      {(SUPPORT_EMAIL || whatsappDigits) && (
        <section className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Otras formas de contacto</h2>
          <div className="space-y-4">
            {whatsappDigits && (
              <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className={CHANNEL_CLASSES}>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">WhatsApp</h3>
                  <p className="text-sm text-slate-500">+{whatsappDigits}</p>
                </div>
              </a>
            )}
            {SUPPORT_EMAIL && (
              <a href={`mailto:${SUPPORT_EMAIL}`} className={CHANNEL_CLASSES}>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Correo</h3>
                  <p className="text-sm text-slate-500">{SUPPORT_EMAIL}</p>
                </div>
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
