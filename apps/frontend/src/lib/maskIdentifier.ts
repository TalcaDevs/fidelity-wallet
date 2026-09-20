// El RUT y el teléfono son datos personales de clientes finales. En pantalla
// basta con los últimos dígitos para que el comercio identifique la visita, y
// esta misma UI se reutilizará en la caja, donde la ve cualquiera.
const VISIBLE_CHARS = 5;

export function maskIdentifier(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (trimmed.length <= VISIBLE_CHARS) return trimmed;

  return `···${trimmed.slice(-VISIBLE_CHARS)}`;
}
