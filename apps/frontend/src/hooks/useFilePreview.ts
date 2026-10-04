import { useCallback, useEffect, useRef, useState } from 'react';

export interface FilePreview {
  file: File;
  url: string;
}

/**
 * Un archivo elegido con su URL de vista previa. La URL se crea al elegirlo (no en un memo, que
 * React puede volver a ejecutar) y se revoca al reemplazarlo, al quitarlo y al desmontar.
 */
export function useFilePreview(): [FilePreview | null, (file: File | null) => void] {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const current = useRef<FilePreview | null>(null);

  const replace = useCallback((file: File | null) => {
    if (current.current) URL.revokeObjectURL(current.current.url);
    current.current = file ? { file, url: URL.createObjectURL(file) } : null;
    setPreview(current.current);
  }, []);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current.url);
    },
    [],
  );

  return [preview, replace];
}
