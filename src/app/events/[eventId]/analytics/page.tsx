"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  PieChart,
  BadgeCheck,
  CalendarDays,
  Loader2,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

interface CategoryStat {
  category: string;
  registered: number;
  badges: number;
  pending: number;
  rate: number;
}

interface TrendRow {
  date: string;
  label: string;
  registered?: number;
  badges?: number;
}

interface EventAnalytics {
  event: {
    id: string;
    name: string;
    code: string;
    status: "draft" | "active" | "completed";
    startDate: string | null;
    endDate: string | null;
    location: string;
  };
  summary: {
    registered: number;
    badges: number;
    pending: number;
    badgeRate: number;
  };
  categoryStats: CategoryStat[];
  registrationTrend: TrendRow[];
  badgeTrend: TrendRow[];
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function statusClasses(
  status: EventAnalytics["event"]["status"],
) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "completed") {
    return "border-stone-200 bg-stone-100 text-stone-600";
  }

  return "border-orange-200 bg-orange-50 text-orange-700";
}

export default function EventAnalyticsPage() {
  const params = useParams<{
    eventId: string;
  }>();

  const eventId = params.eventId;

  const [analytics, setAnalytics] =
    useState<EventAnalytics | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    if (!eventId) return;

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}/analytics`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load analytics.",
        );
      }

      setAnalytics(data.analytics ?? null);
    } catch (error) {
      console.error(
        "Failed to load event analytics:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load analytics.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [eventId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-5 py-10 text-[#241000] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#EA580C]" />
              <p className="mt-4 text-sm font-semibold text-stone-500">
                Loading event analytics...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-5 py-10 text-[#241000] sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <BarChart3 className="mx-auto h-10 w-10 text-red-400" />
            <h1 className="mt-5 text-2xl font-bold">
              Unable to load analytics
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {error || "No analytics data was returned."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadAnalytics}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <Link
                href={`/events/${eventId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Event
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const maxTrend = Math.max(
    ...analytics.registrationTrend.map(
      (item) => item.registered ?? 0,
    ),
    ...analytics.badgeTrend.map(
      (item) => item.badges ?? 0,
    ),
    1,
  );

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#241000]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl" />
        <div className="absolute right-[-12rem] top-[18rem] h-[32rem] w-[32rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
          <Link
            href={`/events/${eventId}`}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="text-lg font-bold tracking-tight">
                Badge<span className="text-[#EA580C]">Flow</span>
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Event Analytics
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAnalytics}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href={`/events/${eventId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#241000] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3b1b08]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                Event
              </span>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusClasses(
                    analytics.event.status,
                  )}`}
                >
                  {analytics.event.status}
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 font-mono text-[10px] font-bold text-stone-500">
                  {analytics.event.code}
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {analytics.event.name}
              </h1>

              <div className="mt-4 flex flex-col gap-2 text-sm text-stone-500 sm:flex-row sm:flex-wrap sm:gap-x-6">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#EA580C]" />
                  {formatDate(analytics.event.startDate)}
                  {analytics.event.endDate
                    ? ` → ${formatDate(
                        analytics.event.endDate,
                      )}`
                    : ""}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#EA580C]" />
                  {analytics.event.location ||
                    "Location not specified"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">
                Badge completion
              </p>
              <p className="mt-1 text-3xl font-black text-[#EA580C]">
                {formatPercent(
                  analytics.summary.badgeRate,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Registered attendees",
              value: analytics.summary.registered,
              icon: Users,
            },
            {
              label: "Badges generated",
              value: analytics.summary.badges,
              icon: BadgeCheck,
            },
            {
              label: "Pending badges",
              value: analytics.summary.pending,
              icon: BarChart3,
            },
            {
              label: "Generation rate",
              value: formatPercent(
                analytics.summary.badgeRate,
              ),
              icon: TrendingUp,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-2xl font-black">
                  {typeof item.value === "number"
                    ? item.value.toLocaleString()
                    : item.value}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">
                  Attendee category mix
                </h2>
                <p className="mt-1 text-xs text-stone-400">
                  Distribution of registered attendees across categories.
                </p>
              </div>
              <PieChart className="h-5 w-5 text-[#EA580C]" />
            </div>

            {analytics.categoryStats.length === 0 ? (
              <div className="flex min-h-[330px] items-center justify-center text-sm text-stone-400">
                No category data available yet.
              </div>
            ) : (
              <div className="mt-6 grid items-center gap-6 md:grid-cols-[minmax(240px,1fr)_minmax(190px,0.9fr)]">
                <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-full" style={{ background: `conic-gradient(${analytics.categoryStats.map((item, index) => { const total = analytics.categoryStats.reduce((sum, row) => sum + row.registered, 0) || 1; const start = analytics.categoryStats.slice(0, index).reduce((sum, row) => sum + row.registered, 0) / total * 360; const end = (start + item.registered / total * 360); const colors = ["#EA580C", "#241000", "#fb923c", "#78716c", "#f59e0b", "#a8a29e"]; return `${colors[index % colors.length]} ${start}deg ${end}deg`; }).join(", ")})` }}>
                  <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white shadow-inner">
                    <span className="text-3xl font-black text-[#241000]">
                      {analytics.summary.registered.toLocaleString()}
                    </span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                      Registered
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {analytics.categoryStats.map((item, index) => {
                    const total = analytics.categoryStats.reduce((sum, row) => sum + row.registered, 0) || 1;
                    const share = (item.registered / total) * 100;
                    const colors = ["#EA580C", "#241000", "#fb923c", "#78716c", "#f59e0b", "#a8a29e"];
                    return (
                      <div key={item.category} className="rounded-2xl border border-stone-100 bg-stone-50/60 p-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-stone-700">
                            {item.category}
                          </span>
                          <span className="text-xs font-black text-[#241000]">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-1 pl-6 text-[10px] text-stone-400">
                          {item.registered.toLocaleString()} registered · {item.badges.toLocaleString()} badges · {item.pending.toLocaleString()} pending
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">
                  Category badge completion
                </h2>
                <p className="mt-1 text-xs text-stone-400">
                  Completion percentage for every category.
                </p>
              </div>
              <BadgeCheck className="h-5 w-5 text-[#EA580C]" />
            </div>

            <div className="mt-6 space-y-5">
              {analytics.categoryStats.length === 0 ? (
                <p className="py-12 text-center text-sm text-stone-400">
                  No badge data available yet.
                </p>
              ) : (
                analytics.categoryStats.map((item) => (
                  <div key={item.category}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-bold text-stone-700">
                        {item.category}
                      </span>
                      <span className="font-black text-[#EA580C]">
                        {formatPercent(item.rate)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-[#EA580C]"
                        style={{ width: `${Math.min(item.rate, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-stone-400">
                      <span>{item.badges.toLocaleString()} generated</span>
                      <span>{item.pending.toLocaleString()} pending</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
                Registration & badge activity
              </h2>
              <p className="mt-1 text-xs text-stone-400">
                Daily activity derived from attendee registration and badge generation timestamps.
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-[#EA580C]" />
          </div>

          {analytics.registrationTrend.length === 0 &&
          analytics.badgeTrend.length === 0 ? (
            <div className="py-16 text-center text-sm text-stone-400">
              Activity will appear here as attendees are registered and badges are generated.
            </div>
          ) : (
            <div className="mt-7 overflow-x-auto pb-2">
              <div
                className="flex min-w-[720px] items-end gap-3"
                style={{ height: 260 }}
              >
                {analytics.registrationTrend.map(
                  (row) => {
                    const badges =
                      analytics.badgeTrend.find(
                        (item) =>
                          item.date === row.date,
                      )?.badges ?? 0;

                    const registered =
                      row.registered ?? 0;

                    const registeredHeight =
                      Math.max(
                        6,
                        (registered /
                          maxTrend) *
                          190,
                      );

                    const badgeHeight =
                      Math.max(
                        6,
                        (badges /
                          maxTrend) *
                          190,
                      );

                    return (
                      <div
                        key={row.date}
                        className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div className="flex h-[195px] items-end gap-1">
                          <div
                            className="w-4 rounded-t-md bg-orange-200"
                            style={{
                              height: registeredHeight,
                            }}
                            title={`${registered} registered`}
                          />
                          <div
                            className="w-4 rounded-t-md bg-[#EA580C]"
                            style={{
                              height: badgeHeight,
                            }}
                            title={`${badges} badges`}
                          />
                        </div>
                        <span className="max-w-14 truncate text-[9px] text-stone-400">
                          {row.label}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="mt-3 flex items-center justify-center gap-5 text-[10px] font-semibold text-stone-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-200" />
                  Registered
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
                  Badges generated
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 bg-stone-50/60 px-6 py-5">
            <h2 className="text-lg font-bold">
              Category analytics table
            </h2>
            <p className="mt-1 text-xs text-stone-400">
              Exact registration, badge, pending, and completion values.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-stone-100 text-[10px] uppercase tracking-wider text-stone-400">
                <tr>
                  <th className="px-6 py-4 font-bold">
                    Category
                  </th>
                  <th className="px-6 py-4 font-bold">
                    Registered
                  </th>
                  <th className="px-6 py-4 font-bold">
                    Badges
                  </th>
                  <th className="px-6 py-4 font-bold">
                    Pending
                  </th>
                  <th className="px-6 py-4 font-bold">
                    Completion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {analytics.categoryStats.map(
                  (item) => (
                    <tr
                      key={item.category}
                      className="hover:bg-orange-50/30"
                    >
                      <td className="px-6 py-4 font-bold">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {item.registered.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {item.badges.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-stone-500">
                        {item.pending.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-black text-[#EA580C]">
                        {formatPercent(item.rate)}
                      </td>
                    </tr>
                  ),
                )}

                {analytics.categoryStats.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-stone-400"
                    >
                      No attendee categories are available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
