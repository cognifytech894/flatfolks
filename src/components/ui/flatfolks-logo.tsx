export function FlatFolksLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-600/25">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M4 11 L12 4 L20 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9.5" cy="16" r="3.2" fill="white" fillOpacity="0.95" />
          <circle cx="14.5" cy="16" r="3.2" fill="white" fillOpacity="0.65" />
        </svg>
      </div>
      {!compact ? (
        <p className="text-2xl font-bold tracking-tight text-[#111a3a]">
          Flat<span className="text-blue-600">Folks</span>
        </p>
      ) : null}
    </div>
  );
}
