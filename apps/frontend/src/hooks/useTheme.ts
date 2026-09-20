import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function readStoredTheme(): boolean | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // localStorage puede no estar disponible (modo privado, cookies bloqueadas).
  }
  return null;
}

function prefersDark(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => readStoredTheme() ?? prefersDark());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      } catch {
        // El tema seguirá aplicándose en esta sesión aunque no se pueda persistir.
      }
      return next;
    });
  };

  return { isDarkMode, toggleDarkMode };
}
