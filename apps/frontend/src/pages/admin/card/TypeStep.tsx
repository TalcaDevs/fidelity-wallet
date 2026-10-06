import { Link } from 'react-router-dom';
import {
  DEFAULT_PESOS_PER_POINT,
  STAMPS_TARGET_MAX,
  type CardConfigDto,
  type CardReward,
  type CardType,
} from '@fidelity/shared';
import { ROUTES } from '../../../components/routing/routePaths';
import type { CardEditor } from './useCardEditor';

const clp = new Intl.NumberFormat('es-CL');

interface Option {
  type: CardType | null;
  title: string;
  description: string;
  example: string;
  icon: string;
}

const OPTIONS: Option[] = [
  {
    type: 'STAMPS',
    title: 'Sellos / Visitas',
    description: 'Junta un sello por cada visita y canjea un premio.',
    example: '10 sellos · café gratis',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  {
    type: 'POINTS',
    title: 'Puntos por compra',
    description: 'Cada compra suma puntos según el monto. El cliente los canjea por premios.',
    example: '1 punto cada $1.000',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const SOON: Pick<Option, 'title' | 'description'>[] = [
  { title: 'Monedero / Cashback', description: 'Devuelve un % de cada compra como saldo.' },
  { title: 'Cupón', description: 'Un beneficio que el cliente guarda y presenta al pagar.' },
  { title: 'Tarjeta de regalo', description: 'Saldo prepagado que el cliente recarga y gasta.' },
  { title: 'Membresía', description: 'Una credencial con el nombre del socio y su nivel.' },
];

/**
 * Al cambiar de tipo, una meta de sellos (10) no sirve como costo en puntos ni al revés: se
 * propone una equivalente (10 sellos ≈ 100 puntos) que el dueño ajusta en el paso siguiente.
 */
function convertRewards(rewards: CardReward[], to: CardType): CardReward[] {
  return rewards.map((r) => ({
    ...r,
    target: to === 'POINTS' ? r.target * 10 : Math.min(STAMPS_TARGET_MAX, Math.max(1, Math.round(r.target / 10))),
  }));
}

function determineNewType(stamps: boolean, points: boolean): CardType {
  if (stamps && points) return 'DUAL';
  if (points) return 'POINTS';
  return 'STAMPS';
}

function disabledReason(key: 'STAMPS' | 'POINTS', stampsEnabled: boolean, pointsEnabled: boolean, saved: CardConfigDto): string | null {
  if (key === 'POINTS' && !saved.points.enabled) return 'Los puntos no están habilitados para tu marca.';
  
  // Si intenta deshabilitar
  const isCurrentlyEnabled = key === 'STAMPS' ? stampsEnabled : pointsEnabled;
  if (isCurrentlyEnabled) {
    // No puede deshabilitar si es la única activa
    if ((key === 'STAMPS' && !pointsEnabled) || (key === 'POINTS' && !stampsEnabled)) {
      return 'Debe haber al menos un modo activo.';
    }
    // Si la tarjeta ya fue guardada con este modo y hay saldo activo, no se puede quitar
    if (saved.typeLocked && (saved.type === 'DUAL' || saved.type === key)) {
      return 'Tus clientes ya tienen saldo en esta modalidad: quitarla se los borraría.';
    }
  }

  return null;
}

export function TypeStep({ editor }: { editor: CardEditor }) {
  const { config, saved, update } = editor;
  if (!config || !saved) return null;
  const pesosPerPoint = saved.points.pesosPerPoint || DEFAULT_PESOS_PER_POINT;

  return (
    <div>
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        ¿Qué beneficios quieres ofrecer?
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
        Puedes activar uno o ambos sistemas a la vez para tu tarjeta de fidelidad.
      </p>

      <div role="group" aria-label="Beneficios de la tarjeta" className="space-y-3">
        {OPTIONS.map((option) => {
          const isStamps = option.type === 'STAMPS';
          const selected = isStamps ? config.stampsEnabled : config.pointsEnabled;
          const reason = disabledReason(option.type as 'STAMPS' | 'POINTS', config.stampsEnabled, config.pointsEnabled, saved);
          const example = option.type === 'POINTS' ? `1 punto cada $${clp.format(pesosPerPoint)}` : option.example;
          
          return (
            <button
              key={option.type}
              type="button"
              role="switch"
              aria-checked={selected}
              disabled={!!reason && selected}
              onClick={() => {
                if (!!reason && !selected) return; // if it's disabled and not selected, can't select it

                const newStampsEnabled = isStamps ? !selected : config.stampsEnabled;
                const newPointsEnabled = !isStamps ? !selected : config.pointsEnabled;
                
                // Evitamos que queden ambos desactivados
                if (!newStampsEnabled && !newPointsEnabled) return;

                const newType = determineNewType(newStampsEnabled, newPointsEnabled);
                
                // Solo convertimos recompensas si pasamos de 1 moneda a otra pura
                // Si agregamos DUAL no modificamos las recompensas, asumimos que convivirán
                let newRewards = config.rewards;
                if (!newStampsEnabled || !newPointsEnabled) {
                  // Si estamos volviendo a un modo puro, revisamos si difiere del modo de las recompensas actuales
                  if (newType !== saved.type && saved.type !== 'DUAL') {
                     newRewards = convertRewards(config.rewards, newType);
                  }
                }

                update({
                  type: newType,
                  stampsEnabled: newStampsEnabled,
                  pointsEnabled: newPointsEnabled,
                  rewards: newRewards,
                  // Reseteamos welcomeBalance si cambiamos de modo puro a modo puro distinto
                  welcomeBalance: (saved.type !== 'DUAL' && newType !== saved.type) ? 0 : saved.welcomeBalance,
                });
              }}
              className={`w-full text-left flex items-start gap-4 rounded-2xl border-2 p-5 transition-colors disabled:cursor-not-allowed ${
                selected
                  ? 'border-brand-blue bg-brand-blue/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 disabled:opacity-60'
              } ${!!reason && !selected ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span
                className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${
                  selected ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-700 text-brand-blue'
                }`}
              >
                <svg aria-hidden="true" className="w-6 h-6" fill={option.type === 'STAMPS' ? 'currentColor' : 'none'} stroke={option.type === 'STAMPS' ? 'none' : 'currentColor'} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={option.icon} />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold text-slate-900 dark:text-white">{option.title}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-300 mt-0.5">{option.description}</span>
                <span className="inline-block mt-2 text-xs font-bold rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                  {example}
                </span>
                {reason && <span className={`block text-xs font-bold mt-2 ${selected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'}`}>{reason}</span>}
              </span>
              <span
                aria-hidden="true"
                className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center ${
                  selected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                {selected && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!saved.points.enabled && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
          ¿Quieres usar puntos? Actívalos en{' '}
          <Link to={ROUTES.settings} className="font-bold text-brand-blue underline underline-offset-2">
            Configuración
          </Link>
          .
        </p>
      )}

      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mt-8 mb-3">Próximamente</h3>
      <ul className="grid sm:grid-cols-2 gap-3">
        {SOON.map((item) => (
          <li key={item.title} className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 opacity-70">
            <p className="font-bold text-slate-700 dark:text-slate-200">{item.title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
