import { Link } from 'react-router-dom';
import { ROUTES } from '../../components/routing/routePaths';
import { LEGAL, LEGAL_IS_DRAFT, TERMS_VERSION } from '../../lib/legal';

/**
 * Términos y condiciones del cliente final (ruta pública /terminos).
 *
 * Es una plantilla estándar para un programa de fidelización por sellos en Chile, alineada con
 * cómo funciona el producto (saldo único de sellos, vencimiento, bloqueo antifraude, canje a
 * elección). ANTES DE PRODUCCIÓN: definir VITE_LEGAL_* (ver .env.example) con los datos reales de
 * la empresa y pasar el texto por revisión legal. Mientras falte alguno, la página muestra un
 * aviso visible de borrador: así no se puede publicar "sin darse cuenta".
 *
 * Si cambia el contenido, subir TERMS_VERSION en src/lib/legal.ts y en
 * apps/backend/src/customers/terms.ts en el mismo PR (un test verifica que coincidan).
 */
interface Section {
  title: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    title: 'Quiénes somos',
    body: (
      <>
        <p>
          {LEGAL.platform} es una plataforma operada por {LEGAL.company}, RUT {LEGAL.companyRut}, con domicilio en{' '}
          {LEGAL.address} (en adelante, “la Plataforma”). La Plataforma permite a comercios adheridos (cada uno, “el
          Comercio”) ofrecer a sus clientes un programa de fidelización con una tarjeta de sellos digital.
        </p>
        <p>
          Cada Comercio es el responsable de su propio programa: define las promociones, los premios, la vigencia de
          los sellos y la entrega de los premios. La Plataforma provee la tecnología que lo hace posible.
        </p>
      </>
    ),
  },
  {
    title: 'Aceptación de estos términos',
    body: (
      <>
        <p>
          Al registrarte y marcar la casilla de aceptación, declaras haber leído y aceptado estos términos y el
          tratamiento de tus datos descrito en la sección “Tus datos personales”. Si no estás de acuerdo, no te
          registres.
        </p>
        <p>
          Debes ser mayor de 18 años, o contar con la autorización de tu padre, madre o representante legal para
          participar.
        </p>
      </>
    ),
  },
  {
    title: 'El programa y tu tarjeta',
    body: (
      <>
        <p>
          Participar es <strong>gratuito</strong> y no requiere instalar ninguna aplicación. Al registrarte obtienes
          una tarjeta digital que puedes guardar en Apple Wallet o Google Wallet, y que te identifica mediante un
          código QR.
        </p>
        <p>
          Para registrarte debes entregar <strong>tu número de teléfono celular o tu correo electrónico</strong> (al
          menos uno). Además puedes indicar, si quieres, tu RUT, tu nombre y tu cumpleaños (día y mes; el año es
          opcional). Todos los datos que entregues deben ser verdaderos y tuyos. Existe una sola tarjeta por persona
          en cada Comercio. La tarjeta es personal e intransferible.
        </p>
        <p>
          Tu nombre y tus datos de contacto son los mismos en todos los Comercios donde tengas una tarjeta. Si ya
          estabas registrado, un nuevo registro solo completa los datos que faltaban: no reemplaza los que ya
          entregaste. Para corregirlos, escríbenos (ver “Tus datos personales”).
        </p>
      </>
    ),
  },
  {
    title: 'Cómo se ganan los sellos',
    body: (
      <ul>
        <li>Recibes un sello cuando el personal del Comercio escanea tu tarjeta o te busca por tu RUT, teléfono o correo y confirma tu compra, de acuerdo con las condiciones que el Comercio informe (por ejemplo, un sello por visita o por compra).</li>
        <li>Al confirmar la compra, el Comercio puede registrar, para validarla, el <strong>monto</strong>, una <strong>nota</strong> y una <strong>foto de la boleta</strong>. El monto solo se registra: no cambia la cantidad de sellos que recibes.</li>
        <li>Para evitar el uso indebido, <strong>una tarjeta puede recibir como máximo un sello cada 30 minutos</strong> en un mismo Comercio. Solo el dueño o administrador del Comercio puede sumar sellos adicionales o varios sellos a la vez (por ejemplo, para compensar un reclamo), indicando siempre el motivo, que queda registrado.</li>
        <li>Los sellos <strong>no tienen valor monetario</strong>: no se pueden canjear por dinero, vender, transferir a otra persona ni traspasar entre Comercios.</li>
      </ul>
    ),
  },
  {
    title: 'Vigencia de los sellos',
    body: (
      <>
        <p>
          Cada Comercio define si sus sellos vencen y cuántos días duran. Esa vigencia se informa al registrarte.
          Cada sello vence por separado, contado desde el día en que lo recibiste. Un sello vencido deja de contar
          para canjear premios.
        </p>
        <p>
          Si el Comercio cambia la vigencia, el cambio aplica solo a los sellos que recibas desde ese momento: los
          sellos que ya tienes mantienen su fecha de vencimiento original.
        </p>
      </>
    ),
  },
  {
    title: 'Promociones y canje de premios',
    body: (
      <ul>
        <li>El Comercio puede tener <strong>varias promociones vigentes al mismo tiempo</strong>, cada una con su premio y la cantidad de sellos que requiere.</li>
        <li><strong>Tus sellos vigentes sirven para cualquiera de las promociones activas.</strong> Tú eliges, al momento del canje, en cuál gastarlos, siempre que te alcancen. También puedes no canjear y seguir juntando para otro premio.</li>
        <li>Al canjear, se descuentan solo los sellos que pide la promoción elegida, empezando por los más antiguos. Los sellos restantes siguen en tu tarjeta con su vencimiento original.</li>
        <li>El premio lo entrega el Comercio, en su local y según su disponibilidad. Un canje realizado no se puede revertir.</li>
      </ul>
    ),
  },
  {
    title: 'Cambios en las promociones',
    body: (
      <p>
        El Comercio puede crear, modificar o terminar sus promociones en cualquier momento, informándolo en su local
        o en la página de registro. Terminar una promoción no te quita sellos: los que tengas vigentes podrás usarlos
        en las demás promociones activas del Comercio. Si un Comercio deja de participar en el programa, sus sellos
        dejarán de poder canjearse; la Plataforma procurará que el Comercio avise con anticipación razonable.
      </p>
    ),
  },
  {
    title: 'Uso indebido',
    body: (
      <p>
        Está prohibido registrarse con datos falsos o de otra persona, compartir o reproducir el código de tu tarjeta
        para que otros acumulen o canjeen sellos, o intentar obtener sellos o premios de cualquier forma no autorizada.
        Ante un uso indebido, el Comercio o la Plataforma podrán anular los sellos involucrados y suspender la tarjeta.
      </p>
    ),
  },
  {
    title: 'Tus datos personales',
    body: (
      <>
        <p>
          Tratamos tus datos conforme a la Ley N° 19.628 sobre Protección de la Vida Privada y demás normativa
          aplicable.
        </p>
        <ul>
          <li><strong>Qué datos:</strong> tu teléfono celular y/o tu correo electrónico; si decides entregarlos, tu RUT, tu nombre y tu cumpleaños; y el historial de sellos y canjes de tu tarjeta (fecha, hora y Comercio), junto con el monto, la nota y la foto de la boleta cuando el Comercio los registre al validar tu compra. La foto de la boleta puede mostrar el detalle de lo que compraste.</li>
          <li><strong>Para qué:</strong> identificarte, emitir y actualizar tu tarjeta, registrar tus sellos y canjes, validar tus compras, prevenir el uso indebido y, de forma agregada, entregar al Comercio estadísticas de su programa. Tu nombre se usa para reconocerte en caja y en tu tarjeta digital, y tu cumpleaños para que el Comercio pueda saludarte u ofrecerte beneficios de cumpleaños.</li>
          <li><strong>Con quién se comparten:</strong> con cada Comercio donde tengas una tarjeta: su personal de caja ve solo tu primer nombre y tus datos de contacto parcialmente ocultos al escanear tu tarjeta, y su dueño o administrador puede ver tus datos completos, tu historial de compras en su Comercio (incluidas las fotos de boletas) y exportarlos para gestionar su programa. El equipo de la Plataforma puede acceder a ellos solo para dar soporte y prevenir el uso indebido, y cada acceso queda registrado. También se comparten con los proveedores tecnológicos necesarios para operar el servicio (alojamiento y Apple o Google para tu tarjeta digital). <strong>No vendemos ni cedemos tus datos</strong> a terceros para publicidad.</li>
          <li><strong>Cuánto tiempo:</strong> mientras tengas una tarjeta activa y, después, solo el tiempo que exija la ley.</li>
          <li><strong>Tus derechos:</strong> puedes pedir acceso, rectificación, cancelación u oposición al tratamiento de tus datos, y solicitar la eliminación de tu tarjeta, escribiendo a {LEGAL.contactEmail}. Eliminar la tarjeta borra también sus sellos.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Responsabilidad',
    body: (
      <p>
        La Plataforma procura que el servicio esté disponible de forma continua, pero puede haber interrupciones por
        mantenimiento o fallas ajenas, incluidas las de Apple Wallet, Google Wallet o tu dispositivo. La calidad, el
        stock y la entrega de los premios son responsabilidad del Comercio que los ofrece.
      </p>
    ),
  },
  {
    title: 'Cambios a estos términos',
    body: (
      <p>
        Podemos actualizar estos términos. La versión vigente siempre estará publicada en esta página, con su fecha.
        Si el cambio es relevante, te pediremos que lo aceptes nuevamente la próxima vez que te registres o
        actualices tus datos.
      </p>
    ),
  },
  {
    title: 'Ley aplicable y contacto',
    body: (
      <p>
        Estos términos se rigen por las leyes de la República de Chile, incluida la Ley N° 19.496 sobre Protección
        de los Derechos de los Consumidores. Para consultas o reclamos escríbenos a {LEGAL.contactEmail}; también
        puedes acudir al SERNAC.
      </p>
    ),
  },
];

export function Terms() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900 font-sans">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <Link to={ROUTES.home} className="text-sm font-bold text-blue-700 hover:underline">
          ← {LEGAL.platform}
        </Link>

        {LEGAL_IS_DRAFT && (
          <p role="note" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            Borrador: faltan los datos legales de la empresa. Este texto no es la versión definitiva.
          </p>
        )}

        <h1 className="mt-6 text-3xl font-black leading-tight sm:text-4xl">
          Términos y condiciones del programa de sellos
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Versión vigente desde el {formatVersion(TERMS_VERSION)}
        </p>

        <ol className="mt-8 space-y-8">
          {SECTIONS.map((section, i) => (
            <li key={section.title}>
              <h2 className="text-lg font-black">
                {i + 1}. {section.title}
              </h2>
              <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate-700 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {section.body}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function formatVersion(version: string): string {
  const [y, m, d] = version.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}
