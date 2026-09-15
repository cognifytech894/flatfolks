"use client";

import { useState } from "react";
import { LockKeyhole, Mail, MapPin, UserRound, UsersRound } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { searchLocations } from "@/data/indian-cities";

type PublicUser = { id: string; name: string; email: string; phone?: string; location?: string; gender?: "Boy" | "Girl" };
type Step = "email" | "otp" | "onboarding";
const fieldClass = "mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 focus-within:border-blue-500";
const inputClass = "w-full bg-transparent outline-none";

export default function AuthPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [gender, setGender] = useState<"Boy" | "Girl" | "">("");
  const locationSuggestions = searchLocations(location);

  function finish(user: PublicUser) {
    localStorage.setItem("flatfolks_user", JSON.stringify(user));
    // A full navigation ensures the home navigation reads the just-saved login
    // session immediately after authentication.
    window.location.assign("/");
  }

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email-auth-request", email }) });
      const result = await response.json() as { error?: string; developmentCode?: string };
      if (!response.ok) throw new Error(result.error || "Could not send OTP.");
      setDevelopmentCode(result.developmentCode || "");
      setOtp("");
      setStep("otp");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send OTP."); }
    finally { setLoading(false); }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email-auth-verify", email, otp }) });
      const result = await response.json() as { error?: string; user?: PublicUser; isNewUser?: boolean };
      if (!response.ok || !result.user) throw new Error(result.error || "Invalid or expired OTP.");
      if (result.isNewUser) {
        setUserId(result.user.id);
        setName(result.user.name);
        setStep("onboarding");
      } else {
        finish(result.user);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid or expired OTP."); }
    finally { setLoading(false); }
  }

  async function completeOnboarding(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, location, gender: gender || undefined }) });
      const result = await response.json() as { error?: string; user?: PublicUser };
      if (!response.ok || !result.user) throw new Error(result.error || "Could not save your details.");
      finish(result.user);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your details."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-xl">
        <BackLink />
        <section className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[.22em] text-blue-600">FlatFolks account</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{step === "onboarding" ? "Tell us a bit about you" : "Log in or sign up"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {step === "email" && "Enter your email — we'll send a one-time code. New here? Your account is created automatically."}
            {step === "otp" && `Enter the 6-digit code sent to ${email}.`}
            {step === "onboarding" && "This helps us show you the most relevant flats and flatmates."}
          </p>

          {step === "email" && (
            <form onSubmit={requestOtp} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <div className={fieldClass}><Mail className="h-4 w-4 text-slate-400" /><input autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" /></div>
              </label>
              <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-70">{loading ? "Sending..." : "Send OTP"}</button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                6-digit OTP
                <div className={fieldClass}><LockKeyhole className="h-4 w-4 text-slate-400" /><input autoFocus required value={otp} maxLength={6} inputMode="numeric" onChange={(event) => setOtp(event.target.value)} className={inputClass} placeholder="Enter OTP" /></div>
              </label>
              {developmentCode ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Temporary password (valid for 10 minutes): <b>{developmentCode}</b></p>
              ) : (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">We&apos;ve emailed a 6-digit code to <b>{email}</b>. It expires in 10 minutes.</p>
              )}
              <button disabled={loading || otp.length !== 6} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-70">{loading ? "Verifying..." : "Verify & continue"}</button>
              <button type="button" onClick={() => { setStep("email"); setOtp(""); setDevelopmentCode(""); setMessage(""); }} className="w-full text-sm font-semibold text-blue-600">Use a different email</button>
            </form>
          )}

          {step === "onboarding" && (
            <form onSubmit={completeOnboarding} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Your name
                <div className={fieldClass}><UserRound className="h-4 w-4 text-slate-400" /><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Your full name" /></div>
              </label>
              <label className="relative block text-sm font-medium text-slate-700">
                Location
                <div className={fieldClass}>
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <input
                    value={location}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowLocationSuggestions(false), 150)}
                    onChange={(event) => { setLocation(event.target.value); setShowLocationSuggestions(true); }}
                    autoComplete="off"
                    className={inputClass}
                    placeholder="Area, city or PIN code"
                  />
                </div>
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {locationSuggestions.map(({ label, hint }) => (
                      <button
                        type="button"
                        key={`${label}-${hint}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => { setLocation(hint.startsWith("PIN ") ? label : `${label}, ${hint}`); setShowLocationSuggestions(false); }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-medium text-slate-800">{label}</span>
                        <span className="text-xs text-slate-500">{hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </label>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">You are a</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["Boy", "Girl"] as const).map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setGender(option)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${gender === option ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}
                    >
                      <UsersRound className="h-4 w-4" />{option}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-70">{loading ? "Saving..." : "Finish & continue"}</button>
            </form>
          )}

          {message && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
          {developmentCode && <p className="mt-5 text-center text-xs text-slate-500">Temporary passwords are displayed here for this demo.</p>}
        </section>
      </div>
    </main>
  );
}
