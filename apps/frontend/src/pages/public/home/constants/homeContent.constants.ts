export const BUSINESS_EXAMPLES = [
  {
    name: "Cafeterías",
    title: "Su café favorito. Ahora con una razón más.",
    description:
      "Acompaña ese ritual de cada mañana con sellos que acercan a tus clientes a su próximo café de regalo.",
    reward: "10 sellos = un café de regalo",
    icon: "cup",
  },
  {
    name: "Restaurantes",
    title: "Que el próximo encuentro sea en tu mesa.",
    description:
      "Reconoce a quienes eligen tu cocina y crea una recompensa que les dé ganas de regresar.",
    reward: "8 visitas = un postre de la casa",
    icon: "gift",
  },
  {
    name: "Belleza",
    title: "Un detalle para quienes siempre te eligen.",
    description:
      "Transforma cada visita a tu salón o barbería en un paso hacia un beneficio especial.",
    reward: "6 visitas = un beneficio especial",
    icon: "star",
  },
  {
    name: "Tiendas",
    title: "De una compra a una relación que crece.",
    description:
      "Dale a tu comunidad una tarjeta de tu marca y premia la constancia con beneficios que tú defines.",
    reward: "5 sellos = una sorpresa de tu tienda",
    icon: "wallet",
  },
] as const;

export const FAQS = [
  [
    "¿Mis clientes tienen que instalar una app?",
    "No. Acceden desde el QR de tu local y guardan su tarjeta en la billetera del celular. El alta solicita los datos que hayas definido para tu programa.",
  ],
  [
    "¿Puedo usar el logo y los colores de mi negocio?",
    "Sí. Puedes personalizar el diseño de la tarjeta con tu identidad y definir los sellos y las recompensas de tu programa desde el panel.",
  ],
  [
    "¿Qué necesito para registrar una visita?",
    "Tu equipo puede escanear la tarjeta desde un celular con cámara y conexión a internet. También existe la búsqueda manual de clientes como alternativa.",
  ],
  [
    "¿Funciona si tengo más de un local?",
    "Puedes administrar locales y miembros del equipo de tu marca. Conversemos sobre tu operación para ayudarte a configurar el programa adecuado.",
  ],
] as const;

export const WHATSAPP_URL = `https://wa.me/56940453861?text=${encodeURIComponent("¡Hola! Quiero conocer Fidelity Wallet para mi negocio. ¿Podemos conversar?")}`;
export const EMAIL_URL = `mailto:mezasuarez03@gmail.com?subject=${encodeURIComponent("Quiero Fidelity Wallet para mi negocio")}`;
