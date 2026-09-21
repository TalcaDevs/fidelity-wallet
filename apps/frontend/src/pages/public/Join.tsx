import { useParams } from 'react-router-dom';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';

// Placeholder: reserva la ruta pública de emisión del pase. La pantalla real
// (formulario del cliente + alta del pase en la billetera) la construye Dev 2.
export function Join() {
  const { merchantId } = useParams<{ merchantId: string }>();

  return (
    <PlaceholderScreen
      eyebrow="Landing de emisión"
      title="Tu tarjeta de sellos, en camino"
      description="Acá el cliente final va a pedir su tarjeta y guardarla en Apple Wallet o Google Wallet, sin instalar ninguna app."
    >
      <p>
        Esta pantalla la construye <strong className="text-slate-700 dark:text-slate-200">Dev 2</strong>.
        Por ahora la ruta sólo queda reservada para que nadie la pise.
      </p>
      <p className="mt-3">
        Comercio: <code className="font-mono text-slate-700 dark:text-slate-200">{merchantId}</code>
      </p>
    </PlaceholderScreen>
  );
}
