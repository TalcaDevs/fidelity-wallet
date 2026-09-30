import { useEffect, useMemo, useState } from 'react';
import { attachmentError } from '../../../../lib/supportForm';

/** Captura opcional con vista previa y opción de quitarla (§6.6). Valida tipo y tamaño antes de subir. */
export function AttachmentPicker({
  id,
  file,
  onChange,
}: {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleSelect(selected: File | undefined) {
    if (!selected) return;
    const problem = attachmentError(selected);
    setError(problem);
    onChange(problem ? null : selected);
  }

  return (
    <div>
      {file && previewUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <img src={previewUrl} alt="Vista previa de la captura" className="w-16 h-16 object-cover rounded-lg" />
          <p className="flex-1 min-w-0 text-sm text-slate-600 dark:text-slate-300 truncate">{file.name}</p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100"
          >
            Quitar
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            handleSelect(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-brand-blue/10 file:text-brand-blue"
        />
      )}
      <p className={`text-xs mt-1 ${error ? 'text-red-600' : 'text-slate-500'}`}>{error ?? 'PNG o JPG, hasta 10 MB.'}</p>
    </div>
  );
}
