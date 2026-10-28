/**
 * Traduce errores de autenticación de Supabase a mensajes claros y empáticos en español.
 * Evita exponer jerga técnica o mensajes en inglés a dueños de negocio o clientes.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';

  const message =
    typeof error === 'string'
      ? error
      : (error as { message?: string }).message || '';

  const lower = message.toLowerCase();

  // 1. Registro deshabilitado en la instancia de Supabase ("Signups not allowed for this instance")
  if (lower.includes('signups not allowed') || lower.includes('signup is disabled') || lower.includes('signups are disabled')) {
    return 'El registro de nuevas cuentas está momentáneamente restringido en la plataforma. Si eres dueño de un negocio y deseas comenzar, por favor contáctanos.';
  }

  // 2. Credenciales incorrectas
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid username or password')
  ) {
    return 'El correo o la contraseña ingresados son incorrectos. Por favor, verifica tus datos.';
  }

  // 3. Usuario ya registrado
  if (
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('identity already exists')
  ) {
    return 'Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión o recupera tu contraseña.';
  }

  // 4. Correo pendiente de confirmación
  if (lower.includes('email not confirmed') || lower.includes('email address not confirmed')) {
    return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam para activarlo.';
  }

  // 5. Correo inválido
  if (
    lower.includes('invalid email') ||
    lower.includes('unable to validate email') ||
    lower.includes('email is invalid')
  ) {
    return 'Por favor, ingresa un formato de correo electrónico válido (ej. contacto@comercio.cl).';
  }

  // 6. Contraseña insegura / muy corta
  if (
    lower.includes('password should be') ||
    lower.includes('weak password') ||
    lower.includes('pwned password')
  ) {
    return 'La contraseña no cumple con los requisitos mínimos de seguridad. Prueba con una más segura.';
  }

  // 7. Límite de intentos / Rate limit
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over email send rate limit')
  ) {
    return 'Demasiados intentos seguidos. Por favor, espera unos minutos antes de volver a intentar.';
  }

  // 8. Falla de conexión / Red
  if (
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('connection')
  ) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.';
  }

  // 9. Error de Google OAuth / Popup cancelado
  if (lower.includes('popup') || lower.includes('cancelled') || lower.includes('closed')) {
    return 'La autenticación con Google fue cancelada o bloqueada por el navegador. Intenta nuevamente.';
  }

  // 10. Fallback amigable si es cualquier otro mensaje técnico en inglés
  if (lower.includes('error') || lower.includes('database') || lower.includes('unexpected') || lower.includes('server')) {
    return 'Ocurrió un problema temporal al procesar tu solicitud. Por favor, intenta nuevamente en unos momentos.';
  }

  return message.trim() || 'Ocurrió un inconveniente al procesar tu solicitud. Por favor, intenta de nuevo.';
}
