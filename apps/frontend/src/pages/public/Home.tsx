import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { ROUTES } from '../../components/routing/routePaths';

const STEPS = [
  {
    title: 'Escanea el QR del local',
    description:
      'Tu cliente apunta la cámara al QR del mostrador y agrega su tarjeta de sellos a Apple Wallet o Google Wallet. No instala ninguna app.',
    icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 4h2v2h-2v-2zm4-4h2v2h-2v-2zm-4 0h2v2h-2v-2zm4 4h2v2h-2v-2z',
  },
  {
    title: 'Suma un sello en cada visita',
    description:
      'En la caja escanean la tarjeta del cliente desde el celular del local y el sello queda registrado al instante, sin papeles ni plásticos.',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Se desbloquea el premio',
    description:
      'Al completar los sellos que definiste, la tarjeta del cliente avisa sola que el premio está listo para canjear.',
    icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zM5 21h14a1 1 0 001-1v-6H4v6a1 1 0 001 1zM4 10h16a1 1 0 011 1v2H3v-2a1 1 0 011-1z',
  },
] as const;

const AUDIENCES = [
  { label: 'Cafeterías', detail: 'La clásica tarjeta del décimo café, sin cartones perdidos.' },
  { label: 'Restaurantes', detail: 'Premia al que vuelve y mide cuántos vuelven de verdad.' },
  { label: 'Locales de barrio', detail: 'Peluquerías, lavaderos, panaderías: cualquier visita repetida.' },
] as const;

/**
 * Landing pública del producto.
 *
 * OJO (deuda consciente del MVP): esto es una SPA, así que el contenido se
 * pinta con JavaScript y los buscadores lo indexan mal. Si esta landing
 * necesita posicionar, hay que prerenderizarla o moverla a un sitio estático
 * aparte. El panel quedó bajo /admin/* justamente para que esa separación
 * después sea gratis: se corta por prefijo de ruta y nada más.
 */
export function Home() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Fondos decorativos, mismos tonos que el panel */}
      <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] bg-brand-blue/10 dark:bg-brand-blue/15 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="pointer-events-none fixed bottom-0 left-0 w-[500px] h-[500px] bg-brand-yellow/10 dark:bg-brand-yellow/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-brand-blue/30">
                W
              </div>
              <span className="text-lg font-extrabold tracking-tight">Fidelity Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <Link
                to={ROUTES.login}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-blue hover:text-brand-blue dark:hover:text-brand-blue transition-all"
              >
                Entrar al panel
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-5">
          <section className="pt-14 pb-16 md:pt-24 md:pb-24 grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold uppercase tracking-wide">
                Sin apps · Sin cartones
              </span>
              <h1 className="mt-5 text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
                La tarjeta de sellos de tu local,{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-yellow">
                  en la billetera del celular
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Fidelity Wallet es una plataforma de fidelización por sellos. Tu cliente guarda su
                tarjeta en Apple Wallet o Google Wallet y no instala ninguna aplicación: la lleva
                junto a sus tarjetas y sus pasajes, donde sí la va a ver.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#como-funciona"
                  className="px-6 py-3.5 rounded-2xl bg-brand-blue hover:bg-blue-600 text-white font-bold shadow-lg shadow-brand-blue/25 transition-all active:scale-[0.98]"
                >
                  Cómo funciona
                </a>
                <a
                  href="#para-quien"
                  className="px-6 py-3.5 rounded-2xl font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  ¿Es para mi local?
                </a>
              </div>
            </div>

            {/* Tarjeta de ejemplo: SVG inline, sin assets externos */}
            <div className="relative">
              <div className="rounded-3xl bg-white dark:bg-brand-slate border border-slate-200/80 dark:border-slate-700/50 shadow-2xl shadow-brand-blue/10 dark:shadow-black/40 p-6 md:p-7 md:rotate-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Café Esquina</p>
                    <p className="text-xl font-extrabold tracking-tight dark:text-white">Tarjeta de sellos</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-yellow to-brand-orange flex items-center justify-center text-white font-black shadow-md">
                    ★
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-5 gap-2.5">
                  {Array.from({ length: 10 }, (_, index) => {
                    const stamped = index < 7;
                    return (
                      <div
                        key={index}
                        aria-hidden="true"
                        className={`aspect-square rounded-2xl flex items-center justify-center border-2 ${
                          stamped
                            ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                            : 'border-dashed border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d={stamped ? 'M5 13l4 4L19 7' : 'M12 6v12m6-6H6'}
                          />
                        </svg>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-6 text-sm font-bold text-slate-500 dark:text-slate-400">
                  7 de 10 sellos · faltan 3 para el premio
                </p>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-brand-blue to-brand-yellow" />
                </div>
              </div>
            </div>
          </section>

          <section id="como-funciona" className="py-14 md:py-20 scroll-mt-20">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Cómo funciona</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
              Tres pasos, y ninguno le pide al cliente descargar nada.
            </p>

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={step.icon} />
                      </svg>
                    </div>
                    <span className="text-sm font-black text-slate-300 dark:text-slate-600">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section id="para-quien" className="py-14 md:py-20 scroll-mt-20">
            <div className="rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 p-7 md:p-12">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Para quién es</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
                Para el comercio chico que vive de que la gente vuelva.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {AUDIENCES.map((audience) => (
                  <div
                    key={audience.label}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40"
                  >
                    <p className="font-extrabold tracking-tight">{audience.label}</p>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {audience.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-2.5 text-sm font-bold text-slate-500 dark:text-slate-400">
                <span className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  Apple Wallet
                </span>
                <span className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  Google Wallet
                </span>
                <span>El cliente no instala nada.</span>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 mt-6">
          <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Fidelity Wallet · Fidelización por sellos para comercios
            </p>
            <Link
              to={ROUTES.login}
              className="text-sm font-bold text-brand-blue hover:text-blue-500 transition-colors"
            >
              Entrar al panel →
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
