import { Link } from 'react-router-dom';

export function JoinNotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-black mb-2 text-slate-800">Local no encontrado</h1>
      <p className="text-slate-500 mb-6">No pudimos encontrar una promoción activa para este enlace.</p>
      <Link to="/" className="text-blue-600 font-bold hover:underline">Volver al inicio</Link>
    </div>
  );
}
