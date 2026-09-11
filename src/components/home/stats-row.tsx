import { Building2, House, ShieldCheck, UsersRound } from "lucide-react";

const stats = [[UsersRound, "10,000+", "Verified Users", "bg-violet-50 text-violet-500"], [House, "5,000+", "Properties Listed", "bg-emerald-50 text-emerald-500"], [Building2, "25+", "Cities Covered", "bg-amber-50 text-amber-500"], [ShieldCheck, "98%", "Successful Matches", "bg-blue-50 text-blue-500"]] as const;

export function StatsRow() {
  return <div className="grid grid-cols-2 gap-y-4 rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm sm:grid-cols-4 sm:gap-0">{stats.map(([Icon, value, label, color], i) => <div key={label} className={`flex items-center gap-3 sm:px-4 ${i && "sm:border-l sm:border-slate-100"}`}><span className={`grid h-10 w-10 place-items-center rounded-full ${color}`}><Icon className="h-5 w-5" /></span><span><b className="block text-xl leading-5">{value}</b><small className="text-[10px] text-slate-500">{label}</small></span></div>)}</div>;
}
