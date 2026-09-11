import { House } from "lucide-react";

export function FlatFolksLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        <House className="h-6 w-6" />
      </div>
      {!compact ? (
        <div>
          <p className="text-2xl font-bold tracking-tight text-[#111a3a]">FlatFolks</p>
        </div>
      ) : null}
    </div>
  );
}
