import { useEffect, useState } from 'react';

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

export function useMediaQuery(query: string): boolean {
  const [state, setState] = useState(() => ({ query, isMatch: matches(query) }));

  // Si cambia la consulta, se recalcula durante el render en vez de en un efecto.
  if (state.query !== query) {
    setState({ query, isMatch: matches(query) });
  }

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) =>
      setState({ query, isMatch: event.matches });

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return state.isMatch;
}
