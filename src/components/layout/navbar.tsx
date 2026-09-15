"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { FlatFolksLogo } from "@/components/ui/flatfolks-logo";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const navClass = (active: boolean) => `py-4 transition hover:text-blue-600 ${active ? "border-b-2 border-blue-600 text-blue-600" : "border-b-2 border-transparent"}`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedUser = localStorage.getItem("flatfolks_user");
      if (savedUser) setUser(JSON.parse(savedUser) as { name: string });
      setHasChatAccess((JSON.parse(localStorage.getItem("flatfolks_chat_requests") || "[]") as string[]).length > 0);
      setProfilePhoto(localStorage.getItem("flatfolks_profile_photo") || "");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const syncPhoto = () => setProfilePhoto(localStorage.getItem("flatfolks_profile_photo") || "");
    window.addEventListener("flatfolks-profile-photo", syncPhoto);
    return () => window.removeEventListener("flatfolks-profile-photo", syncPhoto);
  }, []);

  useEffect(() => {
    const syncChatAccess = () => setHasChatAccess((JSON.parse(localStorage.getItem("flatfolks_chat_requests") || "[]") as string[]).length > 0);
    window.addEventListener("flatfolks-chat-access", syncChatAccess);
    return () => window.removeEventListener("flatfolks-chat-access", syncChatAccess);
  }, []);

  return (
    <header className="sticky top-0 z-50 pointer-events-auto border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-3 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/" className="flex items-center gap-3">
          <FlatFolksLogo />
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium text-slate-900 lg:flex">
          <Link href="/" className={navClass(pathname === "/")}>Home</Link>
          <Link href="/search" className={navClass(pathname === "/search")}>Find Room</Link>
          <Link href="/flatmates" className={navClass(pathname === "/flatmates")}>Find Room Mate</Link>
          <div className="group relative"><button className={`flex items-center gap-1 ${navClass(pathname.startsWith("/property"))}`}>Post Property <ChevronDown className="h-3.5 w-3.5" /></button><div className="invisible absolute left-0 top-full z-50 w-72 translate-y-2 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"><Link href="/property?intent=flat" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600"><b className="block">Looking for a flat</b><small className="text-xs text-slate-500">Add your location, budget and amenities</small></Link><Link href="/property?intent=flatmate" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600"><b className="block">Looking for a flatmate</b><small className="text-xs text-slate-500">Add your flat, amenities and up to 3 photos</small></Link></div></div>
          {hasChatAccess && <Link href="/chat" className={navClass(pathname === "/chat")}>One-to-One Chat</Link>}
          <Link href="/about" className={navClass(pathname === "/about")}>About Us</Link>
        </nav>

        <div className="flex items-center gap-3">
          <button className="hidden items-center gap-2 text-sm font-medium text-slate-800 xl:flex" aria-label="Choose country"><Globe className="h-4 w-4" />India<ChevronDown className="h-3.5 w-3.5" /></button>
          {user ? <Link href="/profile" aria-label="Open profile" className="hidden min-w-14 flex-col items-center text-xs font-semibold text-slate-800 sm:flex">{profilePhoto ? <img src={profilePhoto} alt="Profile" className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-100" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>}<span className="mt-1 max-w-20 truncate">{user.name.split(" ")[0]}</span></Link> : <button onClick={() => router.push("/auth")} className="rounded-full bg-slate-100 px-7 py-3 text-sm font-medium text-slate-900 transition hover:bg-blue-50 hover:text-blue-700">Login / Register</button>}
        </div>
      </div>
    </header>
  );
}
