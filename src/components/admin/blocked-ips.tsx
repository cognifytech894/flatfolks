"use client";

import { useState } from "react";
import { ShieldBan } from "lucide-react";
import type { AdminLoginBlock } from "@/lib/admin-login-guard";
import { sessionEnded } from "@/components/admin/session-ended";

/** IPs blocked from admin login after 3 wrong passwords; a block lasts until it's lifted here. */
export function BlockedIps({ initialBlocked }: { initialBlocked: AdminLoginBlock[] }) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function unblock(ip: string) {
    setBusy(ip); setError("");
    try {
      const response = await fetch("/api/admin/blocked-ips", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ip }) });
      if (sessionEnded(response)) return;
      const result = await response.json() as { error?: string };
      if (!response.ok && response.status !== 404) throw new Error(result.error || "Could not unblock.");
      setBlocked((current) => current.filter((item) => item.ip !== ip));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not unblock."); }
    finally { setBusy(""); }
  }

  return (
    <div className="mt-8 rounded-[1.5rem] border border-slate-200 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ShieldBan className="h-5 w-5 text-red-600" />Blocked admin login IPs</h2>
      <p className="mt-1 text-sm text-slate-500">An IP is blocked from admin login after 3 wrong passwords in a row, until you unblock it here. The rest of the site still works for it.</p>
      {blocked.length === 0
        ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No IPs are blocked.</p>
        : <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {blocked.map((item) => (
            <li key={item.ip} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span><b className="font-mono text-slate-900">{item.ip}</b><span className="ml-2 text-slate-500">blocked {new Date(item.blockedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></span>
              <button type="button" onClick={() => unblock(item.ip)} disabled={busy === item.ip} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{busy === item.ip ? "Unblocking…" : "Unblock"}</button>
            </li>
          ))}
        </ul>}
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
