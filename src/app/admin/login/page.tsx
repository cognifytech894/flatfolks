"use client";

import { useState } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Turns on only after the server accepts the username and password.
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, code: needsCode ? code : "" }),
      });
      const result = await response.json() as { error?: string; needsCode?: boolean };
      if (!response.ok) throw new Error(result.error || "Could not log in.");
      if (result.needsCode) {
        setNeedsCode(true);
        return;
      }
      // Signing in as admin signs out any member account in this browser (the
      // server clears its cookie too), so the header never shows a member
      // while the admin panel is open. A full load makes the header re-read it.
      localStorage.removeItem("flatfolks_user");
      localStorage.removeItem("flatfolks_profile_photo");
      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setNeedsCode(false); setCode(""); setPassword(""); setError("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-semibold text-stone-950">Admin login</h1>
        <p className="mt-1 text-center text-sm text-stone-500">{needsCode ? "Enter the code from your authenticator app" : "Restricted area"}</p>

        {!needsCode ? (
          <>
            <label className="mt-6 block text-sm font-medium text-stone-700">
              Username
              <input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-3 outline-none focus:border-brand-500" autoComplete="username" />
            </label>
            <label className="mt-4 block text-sm font-medium text-stone-700">
              Password
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-stone-200 bg-cream-50 px-4 py-3 focus-within:border-brand-500">
                <Lock className="h-4 w-4 text-stone-500" />
                <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent outline-none" autoComplete="current-password" />
              </div>
            </label>
          </>
        ) : (
          <label className="mt-6 block text-sm font-medium text-stone-700">
            Authenticator code
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-stone-200 bg-cream-50 px-4 py-3 focus-within:border-brand-500">
              <KeyRound className="h-4 w-4 text-stone-500" />
              <input required autoFocus inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength={7} value={code} onChange={(event) => setCode(event.target.value)} className="w-full bg-transparent tracking-widest outline-none" autoComplete="one-time-code" placeholder="123456" />
            </div>
          </label>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button disabled={loading} className="mt-6 w-full rounded-xl bg-brand-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
          {loading ? (needsCode ? "Verifying..." : "Checking...") : (needsCode ? "Verify and log in" : "Continue")}
        </button>
        {needsCode && (
          <button type="button" onClick={startOver} className="mt-3 w-full text-center text-sm text-stone-500 hover:text-stone-700">
            Use a different account
          </button>
        )}
      </form>
    </div>
  );
}
