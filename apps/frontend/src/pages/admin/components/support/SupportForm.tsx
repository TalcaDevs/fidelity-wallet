import { useState } from 'react';
import { TicketCategory, TICKET_CATEGORY_LABELS } from '../../../../types/support';

export function SupportForm({
  onSubmit,
}: {
  onSubmit: (category: TicketCategory, description: string, phone?: string, file?: File | null) => Promise<boolean>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<TicketCategory>('BUGS');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // New field as requested by Phase 3 (Opcional: local)
  const [location, setLocation] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    const descWithLocation = location ? `[Local: ${location}]\n${description}` : description;
    
    const success = await onSubmit(category, descWithLocation, phone, file);
    if (success) {
      setCategory('BUGS');
      setDescription('');
      setPhone('');
      setLocation('');
      setFile(null);
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Formulario de ayuda</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Categoría del problema</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
          >
            {(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map(key => (
              <option key={key} value={key}>{TICKET_CATEGORY_LABELS[key]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Local (Opcional)</label>
          <input 
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Sucursal o local afectado"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descripción detallada</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explícanos qué sucede o qué necesitas..."
            required
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Teléfono de contacto (Opcional)</label>
            <input 
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 0000 0000"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Captura de pantalla (Opcional)</label>
            <input 
              type="file"
              accept="image/png, image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">PNG o JPG. Máximo 10MB.</p>
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            disabled={submitting || !description.trim()}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-blue/30"
          >
            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>
      </form>
      
      {/* Decoración */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
