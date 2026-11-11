"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Home, Plus, Search, UserRound, UsersRound } from "lucide-react";
import { FlatFolksLogo } from "@/components/ui/flatfolks-logo";
import { logout } from "@/lib/logout";

// The account's own photo (saved on login and on every profile change) comes
// first; the separate photo key is only a fallback for older sessions.
function storedPhoto() {
  try {
    const user = JSON.parse(localStorage.getItem("flatfolks_user") || "null") as { photo?: string } | null;
    return user?.photo || localStorage.getItem("flatfolks_profile_photo") || "";
  } catch { return ""; }
}

const menuItem = "block rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-brand-50 hover:text-brand-700";
const menuPanel = "rounded-2xl border border-cream-200 bg-white p-2 shadow-lift";
// Hidden until its wrapper (.group) is hovered or holds keyboard focus.
const dropdown = `invisible absolute right-0 top-full z-50 w-56 translate-y-2 opacity-0 transition group-focus-within:visible group-focus-within:translate-y-1 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-1 group-hover:opacity-100 ${menuPanel}`;

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const navClass = (active: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 transition hover:bg-brand-100 hover:text-brand-800 ${active ? "bg-brand-100 font-semibold text-brand-800" : "text-stone-700"}`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedUser = localStorage.getItem("flatfolks_user");
      if (savedUser) setUser(JSON.parse(savedUser) as { name: string });
      setProfilePhoto(storedPhoto());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const syncPhoto = () => setProfilePhoto(storedPhoto());
    window.addEventListener("flatfolks-profile-photo", syncPhoto);
    return () => window.removeEventListener("flatfolks-profile-photo", syncPhoto);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPostMenuOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  const tabClass = (active: boolean) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${active ? "font-semibold text-brand-800" : "text-stone-600"}`;
  const initial = user?.name.trim().charAt(0).toUpperCase() || "U";
  const avatar = (size: string) => profilePhoto
    ? <img src={profilePhoto} alt="" className={`${size} rounded-full object-cover`} />
    : <span className={`grid ${size} place-items-center rounded-full bg-brand-800 text-xs font-bold text-white`}>{initial}</span>;

  return (
    <>
    {/* Mobile and tablet: the header links are hidden below lg, so they live in this bottom bar instead. */}
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-cream-50/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {postMenuOpen && (
        <div className={`absolute inset-x-3 bottom-full mb-2 ${menuPanel}`}>
          <Link href="/property?intent=flat" className={menuItem}>Looking for a Flat</Link>
          <Link href="/property?intent=flatmate" className={menuItem}>Looking for a Tenant</Link>
        </div>
      )}
      {/* Five tabs with Post raised in the middle: listings are the supply the site needs most. */}
      <div className="mx-auto flex max-w-xl items-stretch px-1">
        <Link href="/" className={tabClass(pathname === "/")}><Home className="h-5 w-5" />Home</Link>
        <Link href="/search" className={tabClass(pathname === "/search")}><Search className="h-5 w-5" /><span className="truncate">Find Room</span></Link>
        <button type="button" onClick={() => setPostMenuOpen((open) => !open)} aria-expanded={postMenuOpen} aria-label="Post a listing" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-2 text-xs font-semibold text-brand-800"><span className={`-mt-5 grid h-12 w-12 place-items-center rounded-full bg-brand-800 text-white shadow-lg shadow-brand-800/30 ring-4 ring-cream-50 transition ${postMenuOpen ? "rotate-45" : ""}`}><Plus className="h-6 w-6" /></span>Post</button>
        <Link href="/flatmates" className={tabClass(pathname === "/flatmates")}><UsersRound className="h-5 w-5" />Flatmates</Link>
        {user
          ? <Link href="/profile" className={tabClass(pathname === "/profile" || pathname === "/dashboard")}>{avatar("h-5 w-5")}Profile</Link>
          : <Link href="/auth" className={tabClass(pathname === "/auth")}><UserRound className="h-5 w-5" />Login</Link>}
      </div>
    </nav>
    <header className="pointer-events-auto sticky top-0 z-50 border-b border-cream-200/80 bg-cream-50/85 backdrop-blur-xl">
      {/* Same width as the page content and footer (max-w-7xl) on every page, home included, so the logo and profile line up with them. */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-3">
          <FlatFolksLogo />
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          <Link href="/" className={navClass(pathname === "/")}><Home className="h-4 w-4" />Home</Link>
          <Link href="/search" className={navClass(pathname === "/search")}><Search className="h-4 w-4" />Find Room</Link>
          <Link href="/flatmates" className={navClass(pathname === "/flatmates")}><UsersRound className="h-4 w-4" />Find Flatmates</Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Hovering (or tabbing to) the button opens the two posting choices. */}
          <div className="group relative hidden lg:block">
            <button className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-900 ${pathname.startsWith("/property") ? "bg-brand-900" : "bg-brand-800"}`}><Plus className="h-4 w-4" />Add Listing <ChevronDown className="h-3.5 w-3.5" /></button>
            <div className={dropdown}>
              <Link href="/property?intent=flat" className={menuItem}>Looking for a Flat</Link>
              <Link href="/property?intent=flatmate" className={menuItem}>Looking for a Tenant</Link>
            </div>
          </div>
          {/* Hovering (or tabbing to) the avatar opens the account menu, like Add Listing. */}
          {user ? (
            <div className="group relative hidden sm:block">
              <Link href="/profile" className="flex min-h-11 items-center gap-2 rounded-full border border-cream-200 bg-white py-1 pl-1 pr-4 text-sm font-semibold text-stone-800 transition hover:border-brand-300">
                {profilePhoto ? <img src={profilePhoto} alt="Profile" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-800 text-sm font-bold text-white">{initial}</span>}
                <span className="max-w-20 truncate">{user.name.split(" ")[0]}</span>
              </Link>
              <div className={dropdown}>
                <p className="truncate border-b border-cream-200 px-3 pb-2.5 pt-1.5 text-base font-bold text-stone-900">Hi {user.name}</p>
                <Link href="/profile" className={`mt-1 ${menuItem}`}>My Profile</Link>
                <button type="button" onClick={logout} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Logout</button>
              </div>
            </div>
          ) : (
            <button onClick={() => router.push("/auth")} className="min-h-11 rounded-full border border-brand-800 px-5 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-800 hover:text-white">Login / Register</button>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
