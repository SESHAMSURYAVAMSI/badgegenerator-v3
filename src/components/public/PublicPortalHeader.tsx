"use client";

import Link from "next/link";
import {
  BarChart3,
  LogOut,
  ScanLine,
  Search,
  Ticket,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

export default function PublicPortalHeader() {
  const params =
    useParams<{
      publicId: string;
    }>();

  const pathname =
    usePathname();

  const router =
    useRouter();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const publicId =
    String(
      params?.publicId ?? "",
    );

  /*
   * Do not show the public navigation
   * on the login page.
   */

  if (
    pathname?.endsWith("/login")
  ) {
    return null;
  }

  if (!publicId) {
    return null;
  }

  const dashboardHref =
    `/public/${encodeURIComponent(
      publicId,
    )}/dashboard`;

  const searchHref =
    `/public/${encodeURIComponent(
      publicId,
    )}`;

  const scanHref =
    `/public/${encodeURIComponent(
      publicId,
    )}/scan`;

  const isDashboard =
    pathname?.endsWith(
      "/dashboard",
    );

  const isSearch =
    pathname ===
    `/public/${publicId}` ||
    pathname ===
    `/public/${encodeURIComponent(
      publicId,
    )}`;

  const isScan =
    pathname?.endsWith("/scan");

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch(
        `/api/public/events/${encodeURIComponent(
          publicId,
        )}/logout`,
        {
          method: "POST",
          cache: "no-store",
        },
      );
    } catch (error) {
      console.error(
        "Public logout error:",
        error,
      );
    } finally {
      router.replace(
        `/public/${encodeURIComponent(
          publicId,
        )}/login`,
      );

      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}

        <Link
          href={dashboardHref}
          className="group flex min-w-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EA580C] to-[#241000] text-white shadow-lg shadow-orange-900/10 transition-transform group-hover:scale-105">
            <Ticket className="h-5 w-5" />
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-base font-black tracking-tight text-[#241000]">
              Badge
              <span className="text-[#EA580C]">
                Flow
              </span>
            </p>

            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">
              Public Event Portal
            </p>
          </div>
        </Link>

        {/* Navigation */}

        <nav className="flex items-center gap-1 rounded-2xl border border-orange-100 bg-orange-50/50 p-1">
          <Link
            href={dashboardHref}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
              isDashboard
                ? "bg-white text-[#EA580C] shadow-sm"
                : "text-stone-500 hover:bg-white/80 hover:text-[#EA580C]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />

            <span className="hidden sm:inline">
              Dashboard
            </span>
          </Link>

          <Link
            href={searchHref}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
              isSearch
                ? "bg-white text-[#EA580C] shadow-sm"
                : "text-stone-500 hover:bg-white/80 hover:text-[#EA580C]"
            }`}
          >
            <Search className="h-4 w-4" />

            <span className="hidden sm:inline">
              Search
            </span>
          </Link>

          <Link
            href={scanHref}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
              isScan
                ? "bg-[#EA580C] text-white shadow-sm"
                : "text-stone-500 hover:bg-white/80 hover:text-[#EA580C]"
            }`}
          >
            <ScanLine className="h-4 w-4" />

            <span className="hidden sm:inline">
              Scan
            </span>
          </Link>
        </nav>

        {/* Logout */}

        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          disabled={loggingOut}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-[#241000] shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
        >
          <LogOut
            className={`h-4 w-4 ${
              loggingOut
                ? "animate-pulse"
                : ""
            }`}
          />

          <span className="hidden sm:inline">
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </span>
        </button>
      </div>
    </header>
  );
}