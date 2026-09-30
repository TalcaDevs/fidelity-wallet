import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function errorMessage(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Carga `fetcher` al montar y cada vez que cambia (memoizarlo con useCallback). Con null no
 * carga: sirve para esperar un id. Ignora respuestas que llegan después de desmontar o de cambiar
 * de fetcher, para que una respuesta vieja no pise a la nueva.
 */
export function useAsyncData<T>(fetcher: (() => Promise<T>) | null) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: fetcher !== null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (err: unknown) => {
        if (!cancelled) setState((prev) => ({ ...prev, error: errorMessage(err), loading: false }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, version]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    setVersion((v) => v + 1);
  }, []);

  const setData = useCallback((update: (prev: T | null) => T | null) => {
    setState((prev) => ({ ...prev, data: update(prev.data) }));
  }, []);

  return { ...state, reload, setData };
}
