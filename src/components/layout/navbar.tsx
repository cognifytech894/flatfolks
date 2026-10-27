"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Home, Plus, Search, UserRound, UsersRound } from "lucide-react";
import { FlatFolksLogo } from "@/components/ui/flatfolks-logo";

// The account's own photo (saved on login and on every profile change) comes
// first; the separate photo key is only a fallback for older sessions.
function storedPhoto() {
  try {
    const user = JSON.parse(localStorage.getItem("flatfolks_user") || "null") as { photo?: string } | null;
    return user?.photo || localStorage.getItem("flatfolks_profile_photo") || "";
  } catch { return ""; }
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const navClass = (active: boolean) => `flex flex-col items-center gap-1 py-2.5 transition hover:text-blue-600 ${active ? "border-b-2 border-blue-600 text-blue-600" : "border-b-2 border-transparent"}`;

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

  const tabClass = (active: boolean) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${active ? "text-blue-600" : "text-slate-600"}`;
  const avatar = (size: string) => profilePhoto
    ? <img src={profilePhoto} alt="" className={`${size} rounded-full object-cover`} />
    : <span className={`grid ${size} place-items-center rounded-full bg-blue-600 text-xs font-bold text-white`}>{user?.name.trim().charAt(0).toUpperCase() || "U"}</span>;

  return (
    <>
    {/* Mobile and tablet: the header links are hidden below lg, so they live in this bottom bar instead. */}
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/75 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {postMenuOpen && (
        <div className="absolute inset-x-3 bottom-full mb-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl">
          <Link href="/property?intent=flat" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600"><b className="block">Looking for a flat</b><small className="text-xs text-slate-500">Add your location, budget and amenities</small></Link>
          <Link href="/property?intent=flatmate" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600"><b className="block">Looking for a flatmate</b><small className="text-xs text-slate-500">Add your flat, amenities and up to 3 photos</small></Link>
        </div>
      )}
      {/* Five tabs with Post raised in the middle: listings are the supply the site needs most. */}
      <div className="mx-auto flex max-w-xl items-stretch px-1">
        <Link href="/" className={tabClass(pathname === "/")}><Home className="h-5 w-5" />Home</Link>
        <Link href="/search" className={tabClass(pathname === "/search")}><Search className="h-5 w-5" /><span className="truncate">Find Room</span></Link>
        <button type="button" onClick={() => setPostMenuOpen((open) => !open)} aria-expanded={postMenuOpen} aria-label="Post a listing" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-2 text-xs font-semibold text-blue-600"><span className={`-mt-5 grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-white transition ${postMenuOpen ? "rotate-45" : ""}`}><Plus className="h-6 w-6" /></span>Post</button>
        <Link href="/flatmates" className={tabClass(pathname === "/flatmates")}><UsersRound className="h-5 w-5" />Flatmates</Link>
        {user
          ? <Link href="/profile" className={tabClass(pathname === "/profile" || pathname === "/dashboard")}>{avatar("h-5 w-5")}Profile</Link>
          : <Link href="/auth" className={tabClass(pathname === "/auth")}><UserRound className="h-5 w-5" />Login</Link>}
      </div>
    </nav>
    <header className="sticky top-0 z-50 pointer-events-auto border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      {/* Same width as the page content and footer (max-w-7xl) on every page, home included, so the logo and profile line up with them. */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-3">
          <FlatFolksLogo />
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium text-slate-900 lg:flex">
          <Link href="/" className={navClass(pathname === "/")}><Home className="h-5 w-5" />Home</Link>
          <Link href="/search" className={navClass(pathname === "/search")}><Search className="h-5 w-5" />Find Room</Link>
          <Link href="/flatmates" className={navClass(pathname === "/flatmates")}><UsersRound className="h-5 w-5" />Find Flatmates</Link>
          <div className="group relative"><button className={navClass(pathname.startsWith("/property"))}><Plus className="h-5 w-5" /><span className="flex items-center gap-1">Add Listing <ChevronDown className="h-3.5 w-3.5" /></span></button><div className="invisible absolute left-0 top-full z-50 w-72 translate-y-2 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"><Link href="/property?intent=flat" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600"><b className="block">Looking for a flat</b><small className="text-xs text-slate-500">Add your location, budget and amenities</small></Link><Link href="/property?intent=flatmate" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600"><b className="block">Looking for a flatmate</b><small className="text-xs text-slate-500">Add your flat, amenities and up to 3 photos</small></Link></div></div>        </nav>

        <div className="flex items-center gap-3">
          {user ? <Link href="/profile" className="hidden min-w-14 flex-col items-center text-xs font-semibold text-slate-800 sm:flex">{profilePhoto ? <img src={profilePhoto} alt="Profile" className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-100" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>}<span className="mt-1 max-w-20 truncate">{user.name.split(" ")[0]}</span></Link> : <button onClick={() => router.push("/auth")} className="rounded-full bg-slate-100 px-7 py-3 text-sm font-medium text-slate-900 transition hover:bg-blue-50 hover:text-blue-700">Login / Register</button>}
        </div>
      </div>
    </header>
    </>
  );
}
