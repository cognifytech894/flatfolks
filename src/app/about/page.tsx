import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Handshake, LockKeyhole, MapPin, MessageCircle, Rocket, ShieldCheck, Target, UsersRound } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { StatsRow } from "@/components/home/stats-row";

export const metadata: Metadata = {
  title: "About FlatFolks | Verified Rooms & Flatmates in India",
  description: "FlatFolks helps you find verified rooms, flats, and compatible flatmates across India with no brokerage — smart search, secure messaging, and direct contact with owners.",
};

const offers = [
  [ShieldCheck, "Verified room and flat listings", "bg-blue-50 text-blue-600"],
  [UsersRound, "Compatible flatmates based on lifestyle and budget", "bg-emerald-50 text-emerald-500"],
  [MapPin, "Smart location and budget search", "bg-amber-50 text-amber-500"],
  [MessageCircle, "Direct communication with owners and roommates", "bg-violet-50 text-violet-500"],
  [LockKeyhole, "Secure and transparent verified profiles", "bg-rose-50 text-rose-500"],
  [Handshake, "No-brokerage, transparent pricing", "bg-cyan-50 text-cyan-600"],
] as const;

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <BackLink />

        <article className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">About FlatFolks</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            Finding the Right Room Shouldn&apos;t Be Difficult.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            At <b>FlatFolks</b>, we believe that finding a room or the right flatmate should be simple, safe, and
            stress-free. Whether you&apos;re a student moving to a new city, a working professional relocating for a
            job, or someone looking to share a home, FlatFolks helps you connect with verified listings and compatible
            roommates&mdash;all in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Find a room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/flatmates"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Find a flatmate <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10">
            <StatsRow />
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            <section>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-600">
                <Target className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-2xl font-bold">Our Mission</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Our mission is to make shared living easier by connecting people with trusted rooms and reliable
                flatmates through a modern, transparent, and user-friendly platform.
              </p>
            </section>
            <section>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-500">
                <Rocket className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-2xl font-bold">Our Vision</h2>
              <p className="mt-3 leading-7 text-slate-600">
                To become India&apos;s most trusted platform for shared living by making room discovery and flatmate
                matching fast, reliable, and accessible for everyone.
              </p>
            </section>
          </div>

          <h2 className="mt-12 text-2xl font-bold">What We Offer</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {offers.map(([Icon, text, color]) => (
              <div key={text} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {text}
              </div>
            ))}
          </div>

          <h2 className="mt-12 text-2xl font-bold">Why Choose FlatFolks?</h2>
          <p className="mt-3 leading-7 text-slate-600">
            We focus on trust, simplicity, and convenience. Every feature is designed to save you time and help you
            make informed decisions when choosing your next home. Whether you&apos;re searching for a private room, a
            shared apartment, or the perfect roommate, FlatFolks is here to make your journey easier.
          </p>

          <div className="mt-12 rounded-2xl bg-[#0b1220] p-8 text-center sm:p-10">
            <h2 className="text-2xl font-bold text-white">Ready to move smarter?</h2>
            <p className="mt-2 text-sm text-slate-300">
              Join thousands of verified users already finding rooms and flatmates on FlatFolks.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/property"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Post a property
              </Link>
            </div>
          </div>

          <p className="mt-10 border-t border-slate-200 pt-6 text-center text-lg font-semibold text-blue-600">
            FlatFolks &mdash; <i>Find Rooms. Find Flatmates. Move Smarter.</i>
          </p>
        </article>
      </div>
    </main>
  );
}
