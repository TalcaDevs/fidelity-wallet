/**
 * Normalización de slugs públicos (/join/:slug). Debe producir lo mismo que la función SQL
 * public.slugify (migración 20260924190000_harden_signup_and_slug): minúsculas, sin tildes,
 * solo [a-z0-9] separados por un guion, sin guiones en los extremos, máximo 60 caracteres.
 */
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 60;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(raw: string): string {
  return (raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes y diéresis (ñ → n)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
}

/** Slug válido para publicar: ya normalizado y con el largo permitido. */
export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN_LENGTH && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
  );
}
