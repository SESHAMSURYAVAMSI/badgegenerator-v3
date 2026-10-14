"use client";

import Link from "next/link";
import {
  BarChart3,
  LogOut,
  ScanLine,
  Search,
  Ticket,
  UserPlus,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
} from "next/navigation";
import { useState } from "react";

export default function PublicPortalHeader() {
  const params = useParams<{ publicId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const publicId = String(params?.publicId ?? "");

  // Do not show the public navigation on the login page.
  if (pathname?.endsWith("/login")) return null;
  if (!publicId) return null;

  const encodedPublicId = encodeURIComponent(publicId);
  const dashboardHref = `/public/${encodedPublicId}/dashboard`;
  const searchHref = `/public/${encodedPublicId}`;
  const scanHref = `/public/${encodedPublicId}/scan`;
  // The public search page opens the spot-registration modal from this query.
  const addPersonHref = `${searchHref}?action=add-person`;

  const isDashboard = pathname?.endsWith("/dashboard");
  const isSearch =
    pathname === `/public/${publicId}` ||
    pathname === `/public/${encodedPublicId}`;
  const isScan = pathname?.endsWith("/scan");

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch(`/api/public/events/${encodedPublicId}/logout`, {
        method: "POST",
        cache: "no-store",
      });
    } catch (error) {
      console.error("Public logout error:", error);
    } finally {
      router.replace(`/public/${encodedPublicId}/login`);
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href={dashboardHref}
          className="group flex min-w-0 shrink-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EA580C] to-[#241000] text-white shadow-lg shadow-orange-900/10 transition-transform group-hover:scale-105">
            <Ticket className="h-5 w-5" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-base font-black tracking-tight text-[#241000]">
              Badge<span className="text-[#EA580C]">Flow</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">
              Public Event Portal
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav
          aria-label="Public event navigation"
          className="flex min-w-0 items-center gap-0.5 rounded-2xl border border-orange-100 bg-orange-50/50 p-1 sm:gap-1"
        >
          <Link
            href={dashboardHref}
            aria-current={isDashboard ? "page" : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
              isDashboard
                ? "bg-white text-[#EA580C] shadow-sm"
                : "text-stone-500 hover:bg-white/80 hover:text-[#EA580C]"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <Link
            href={searchHref}
            aria-current={isSearch ? "page" : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
              isSearch
                ? "bg-white text-[#EA580C] shadow-sm"
                : "text-stone-500 hover:bg-white/80 hover:text-[#EA580C]"
            }`}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Search</span>
          </Link>

          <Link
            href={scanHref}
            aria-current={isScan ? "page" : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
              isScan
                ? "bg-white text-[#EA580C] shadow-sm"
                : "text-stone-500 hover:bg-white/80 hover:text-[#EA580C]"
            }`}
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Scan</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              const onSearchPage =
                pathname === `/public/${publicId}` ||
                pathname === `/public/${encodedPublicId}`;

              if (onSearchPage) {
                // Open the form immediately when already on the search page.
                window.dispatchEvent(
                  new CustomEvent("badgeflow:open-add-person"),
                );
              } else {
                // Navigate to the search page; its initial effect opens the form.
                router.push(addPersonHref);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-2.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#c94b08] sm:px-4 sm:text-sm"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Add Person</span>
            <span className="sm:hidden">Add</span>
          </button>
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-orange-200 bg-white px-2.5 py-2 text-xs font-bold text-[#241000] shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
        >
          <LogOut className={`h-4 w-4 ${loggingOut ? "animate-pulse" : ""}`} />
          <span className="hidden sm:inline">
            {loggingOut ? "Logging out..." : "Logout"}
          </span>
        </button>
      </div>
    </header>
  );
}
