import { Building2, House, ShieldCheck, UsersRound } from "lucide-react";

const stats = [[UsersRound, "10,000+", "Verified Users", "bg-violet-50 text-violet-500"], [House, "5,000+", "Properties Listed", "bg-brand-50 text-brand-600"], [Building2, "25+", "Cities Covered", "bg-amber-50 text-amber-500"], [ShieldCheck, "98%", "Successful Matches", "bg-brand-50 text-brand-500"]] as const;

// Temporarily hidden. Set to true to show the stats row again.
export const SHOW_STATS = false;

export function StatsRow() {
  if (!SHOW_STATS) return null;
  return <div className="grid grid-cols-2 gap-y-4 rounded-xl border border-stone-100 bg-white px-4 py-4 shadow-sm sm:grid-cols-4 sm:gap-0">{stats.map(([Icon, value, label, color], i) => <div key={label} className={`flex items-center gap-3 sm:px-4 ${i && "sm:border-l sm:border-stone-100"}`}><span className={`grid h-10 w-10 place-items-center rounded-full ${color}`}><Icon className="h-5 w-5" /></span><span><b className="block text-xl leading-5">{value}</b><small className="text-xs text-stone-500">{label}</small></span></div>)}</div>;
}
