import { PlaceholderScreen } from '../../components/PlaceholderScreen';

// Placeholder: reserva la ruta del escáner del cajero. Se decidió que la PWA
// del cajero viva DENTRO de esta misma app de frontend (ruta /scan) y no en un
// paquete aparte. La pantalla real la construye Dev 2.
export function Scan() {
  return (
    <PlaceholderScreen
      eyebrow="Escáner del cajero"
      title="Sumar sellos"
      description="Desde acá el local escanea la tarjeta del cliente y registra la visita."
    >
      <p>
        Esta pantalla la construye <strong className="text-slate-700 dark:text-slate-200">Dev 2</strong>.
        Por ahora la ruta sólo queda reservada.
      </p>
      <p className="mt-3">
        La PWA del cajero vive dentro de esta misma app de frontend, bajo{' '}
        <code className="font-mono text-slate-700 dark:text-slate-200">/scan</code>: no es un paquete
        aparte.
      </p>
    </PlaceholderScreen>
  );
}
