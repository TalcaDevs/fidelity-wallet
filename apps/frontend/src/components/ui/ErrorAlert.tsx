export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-2xl border border-red-100 dark:border-red-500/20 flex items-center gap-3">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {message}
    </div>
  );
}
