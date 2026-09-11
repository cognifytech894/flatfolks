import Link from "next/link";
import { ArrowRight, Headset, LockKeyhole, ShieldCheck } from "lucide-react";
import { FlatFolksLogo } from "@/components/ui/flatfolks-logo";

const exploreLinks = [
  ["Search Rooms", "/search"],
  ["Find Flatmates", "/flatmates"],
  ["Post a Property", "/property"],
  ["Dashboard", "/dashboard"],
  ["Login", "/auth"],
] as const;

const trust = [
  [ShieldCheck, "Verified listings", "bg-blue-50 text-blue-600"],
  [LockKeyhole, "Secure messaging", "bg-emerald-50 text-emerald-500"],
  [Headset, "24/7 support", "bg-amber-50 text-amber-500"],
] as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              Trusted by 25k+ renters and landlords
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Your next room, roommate, or perfect place to live starts here.
            </h2>
          </div>
          <Link
            href="/property"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
          >
            List a property <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-10 border-t border-slate-200 pt-10 md:grid-cols-3">
          <div>
            <FlatFolksLogo compact />
            <p className="mt-4 text-sm leading-7 text-slate-600">
              AI-powered housing discovery for students and professionals across India.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Explore
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-slate-600">
              {exploreLinks.map(([label, href]) => (
                <Link key={href} href={href} className="w-fit transition hover:text-blue-600">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Trust
            </p>
            <div className="flex flex-col gap-3">
              {trust.map(([Icon, label, color]) => (
                <div key={label} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FlatFolks. All rights reserved.</p>
          <p>Made with care in India.</p>
        </div>
      </div>
    </footer>
  );
}
