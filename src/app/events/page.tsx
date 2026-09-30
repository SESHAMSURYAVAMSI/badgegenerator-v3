"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

interface EventItem {
  _id: string;
  name: string;
  slug: string;
  code: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  location?: string;
  status: "draft" | "active" | "completed";
  attendeeCount: number;
  badgeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface GlobalAnalytics {
  summary: {
    events: number;
    attendees: number;
    badges: number;
    badgeRate: number;
  };
  categoryStats: {
    category: string;
    registered: number;
    badges: number;
    pending: number;
    rate: number;
  }[];
  eventStats: {
    eventId: string;
    eventName: string;
    eventCode: string;
    registered: number;
    badges: number;
    pending: number;
    rate: number;
  }[];
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "Not scheduled";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

const chartColors = [
  "#EA580C",
  "#F97316",
  "#FB923C",
  "#FDBA74",
  "#C2410C",
  "#9A3412",
  "#7C2D12",
  "#F59E0B",
];

function createDonutGradient(
  categoryStats: GlobalAnalytics["categoryStats"],
) {
  const total = categoryStats.reduce(
    (sum, item) => sum + Math.max(0, item.registered),
    0,
  );

  if (!total) {
    return "conic-gradient(#f5f5f4 0deg 360deg)";
  }

  let currentAngle = 0;

  const stops = categoryStats.map((item, index) => {
    const share = Math.max(0, item.registered) / total;
    const start = currentAngle;
    const end = currentAngle + share * 360;
    currentAngle = end;

    return `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function getStatusClasses(
  status: EventItem["status"],
) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "completed") {
    return "border-stone-200 bg-stone-100 text-stone-600";
  }

  return "border-orange-200 bg-orange-50 text-orange-700";
}

function getStatusLabel(
  status: EventItem["status"],
) {
  if (status === "active") {
    return "Active";
  }

  if (status === "completed") {
    return "Completed";
  }

  return "Draft";
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(
    [],
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [analytics, setAnalytics] =
    useState<GlobalAnalytics | null>(null);

  const [isAnalyticsLoading, setIsAnalyticsLoading] =
    useState(true);

  const [analyticsError, setAnalyticsError] =
    useState("");

  const [eventPerformancePage, setEventPerformancePage] = useState(1);

  const EVENT_PERFORMANCE_PAGE_SIZE = 4;

  async function loadEvents() {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        "/api/events",
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch events.",
        );
      }

      setEvents(data.events ?? []);
    } catch (error) {
      console.error(
        "Failed to load events:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch events.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAnalytics() {
    try {
      setIsAnalyticsLoading(true);
      setAnalyticsError("");

      const response = await fetch(
        "/api/analytics",
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
      setEventPerformancePage(1);
    } catch (error) {
      console.error(
        "Failed to load analytics:",
        error,
      );

      setAnalyticsError(
        error instanceof Error
          ? error.message
          : "Failed to load analytics.",
      );
    } finally {
      setIsAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    loadAnalytics();
  }, []);

  const totalEvents = events.length;

  const activeEvents = events.filter(
    (event) => event.status === "active",
  ).length;

  const totalAttendees = events.reduce(
    (total, event) =>
      total + (event.attendeeCount || 0),
    0,
  );

  const totalBadges = events.reduce(
    (total, event) =>
      total + (event.badgeCount || 0),
    0,
  );

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#241000]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-200/20 blur-3xl" />

        <div className="absolute right-[-12rem] top-[18rem] h-[32rem] w-[32rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <div className="hidden sm:block">
              <div className="text-lg font-bold tracking-tight">
                Badge
                <span className="text-[#EA580C]">
                  Flow
                </span>
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Event Management
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-orange-50 hover:text-[#EA580C]"
            >
              Dashboard
            </Link>

            <Link
              href="/events"
              className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-[#EA580C]"
            >
              Events
            </Link>

            {/* <Link
              href="/attendees"
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-orange-50 hover:text-[#EA580C]"
            >
              Attendees
            </Link>

            <Link
              href="/analytics"
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-orange-50 hover:text-[#EA580C]"
            >
              Analytics
            </Link> */}
          </nav>

          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              Create Event
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* PAGE HERO */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#EA580C]">
              <Sparkles className="h-3.5 w-3.5" />
              Event Management
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Your Events
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
              Create, manage, analyse, and prepare
              professional events and attendee badges.
            </p>
          </div>

          <Link
            href="/events/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#241000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3b1b08]"
          >
            <Plus className="h-4 w-4" />
            Create New Event
          </Link>
        </div>

        {/* SUMMARY */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <CalendarDays className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {totalEvents.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Total events
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {activeEvents.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Active events
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <Users className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {totalAttendees.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Registered attendees
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {totalBadges.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Badges generated
            </p>
          </div>
        </div>

        {/* GLOBAL ANALYTICS */}
        <section className="mt-8 rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#EA580C]">
                <BarChart3 className="h-3.5 w-3.5" />
                Event analytics
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                All events performance
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                Live registration and badge-generation
                analytics calculated from your
                attendee records.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={isAnalyticsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isAnalyticsLoading
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh analytics
            </button>
          </div>

          {analyticsError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {analyticsError}
            </div>
          ) : isAnalyticsLoading ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-2xl bg-stone-50" />
              <div className="h-64 animate-pulse rounded-2xl bg-stone-50" />
            </div>
          ) : analytics ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Events",
                    analytics.summary.events,
                  ],
                  [
                    "Registered",
                    analytics.summary.attendees,
                  ],
                  [
                    "Badges",
                    analytics.summary.badges,
                  ],
                  [
                    "Badge rate",
                    formatPercent(
                      analytics.summary.badgeRate,
                    ),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                      {label}
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#241000]">
                      {typeof value === "number"
                        ? value.toLocaleString()
                        : value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">
                        Category distribution
                      </h3>

                      <p className="mt-1 text-xs text-stone-400">
                        Registered attendees by category
                      </p>
                    </div>

                    <BarChart3 className="h-5 w-5 text-[#EA580C]" />
                  </div>

                  {analytics.categoryStats.length === 0 ? (
                    <p className="mt-5 rounded-xl bg-white p-4 text-sm text-stone-400">
                      No category data available.
                    </p>
                  ) : (
                    <>
                      {(() => {
                        const totalRegistered =
                          analytics.categoryStats.reduce(
                            (sum, item) =>
                              sum +
                              Math.max(0, item.registered),
                            0,
                          );

                        return (
                          <div className="mt-5 grid items-center gap-6 xl:grid-cols-[220px_1fr]">
                            <div
                              className="relative mx-auto h-52 w-52 rounded-full"
                              style={{
                                background:
                                  createDonutGradient(
                                    analytics.categoryStats,
                                  ),
                              }}
                            >
                              <div className="absolute inset-[28px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                                <p className="text-3xl font-black text-[#241000]">
                                  {totalRegistered.toLocaleString()}
                                </p>

                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                                  Registered
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              {analytics.categoryStats.map(
                                (category, index) => {
                                  const share =
                                    totalRegistered > 0
                                      ? (category.registered /
                                          totalRegistered) *
                                        100
                                      : 0;

                                  return (
                                    <div
                                      key={category.category}
                                      className="rounded-xl bg-white p-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className="h-3 w-3 shrink-0 rounded-full"
                                          style={{
                                            backgroundColor:
                                              chartColors[
                                                index %
                                                  chartColors.length
                                              ],
                                          }}
                                        />

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-xs font-bold text-[#241000]">
                                              {category.category}
                                            </p>

                                            <span className="shrink-0 text-xs font-black text-[#EA580C]">
                                              {formatPercent(
                                                share,
                                              )}
                                            </span>
                                          </div>

                                          <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400">
                                            <span>
                                              {category.registered.toLocaleString()}{" "}
                                              registered
                                            </span>

                                            <span>
                                              {category.badges.toLocaleString()}{" "}
                                              badges
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div><div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">
                        Event performance
                      </h3>

                      <p className="mt-1 text-xs text-stone-400">
                        Compare registration and badge progress
                      </p>
                    </div>

                    <CalendarDays className="h-5 w-5 text-[#EA580C]" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {analytics.eventStats.length ===
                    0 ? (
                      <p className="rounded-xl bg-white p-4 text-sm text-stone-400">
                        No event analytics available.
                      </p>
                    ) : (
                      analytics.eventStats
                        .slice(
                          (eventPerformancePage - 1) *
                            EVENT_PERFORMANCE_PAGE_SIZE,
                          eventPerformancePage *
                            EVENT_PERFORMANCE_PAGE_SIZE,
                        )
                        .map(
                        (item) => (
                          <Link
                            key={item.eventId}
                            href={`/events/${item.eventId}`}
                            className="block rounded-xl bg-white p-4 transition hover:border-orange-200 hover:bg-orange-50/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">
                                  {item.eventName}
                                </p>

                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                                  {item.eventCode}
                                </p>
                              </div>

                              <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[11px] text-stone-400">
                              <span>
                                {item.registered.toLocaleString()}{" "}
                                registered
                              </span>

                              <span>
                                {item.badges.toLocaleString()}{" "}
                                badges
                              </span>

                              <span className="font-bold text-[#EA580C]">
                                {formatPercent(item.rate)}
                              </span>
                            </div>
                          </Link>
                        ),
                      )
                    )}
                  </div>

                  {analytics.eventStats.length >
                    EVENT_PERFORMANCE_PAGE_SIZE && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] font-medium text-stone-400">
                        Showing {""}
                        {Math.min(
                          (eventPerformancePage - 1) *
                            EVENT_PERFORMANCE_PAGE_SIZE +
                            1,
                          analytics.eventStats.length,
                        )}
                        {" – "}
                        {Math.min(
                          eventPerformancePage *
                            EVENT_PERFORMANCE_PAGE_SIZE,
                          analytics.eventStats.length,
                        )}
                        {" of "}
                        {analytics.eventStats.length} events
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEventPerformancePage((page) =>
                              Math.max(1, page - 1),
                            )
                          }
                          disabled={eventPerformancePage === 1}
                          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Previous
                        </button>

                        {Array.from(
                          {
                            length: Math.ceil(
                              analytics.eventStats.length /
                                EVENT_PERFORMANCE_PAGE_SIZE,
                            ),
                          },
                          (_, index) => index + 1,
                        ).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() =>
                              setEventPerformancePage(page)
                            }
                            className={`h-9 min-w-9 rounded-lg px-2.5 text-xs font-bold transition ${
                              eventPerformancePage === page
                                ? "bg-[#EA580C] text-white shadow-sm"
                                : "border border-stone-200 bg-white text-stone-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setEventPerformancePage((page) =>
                              Math.min(
                                Math.ceil(
                                  analytics.eventStats.length /
                                    EVENT_PERFORMANCE_PAGE_SIZE,
                                ),
                                page + 1,
                              ),
                            )
                          }
                          disabled={
                            eventPerformancePage ===
                            Math.ceil(
                              analytics.eventStats.length /
                                EVENT_PERFORMANCE_PAGE_SIZE,
                            )
                          }
                          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* EVENTS */}
        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#EA580C]">
                <CalendarDays className="h-3.5 w-3.5" />
                Events
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Manage your events
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                loadEvents();
                loadAnalytics();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[430px] animate-pulse rounded-3xl bg-white shadow-sm"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={loadEvents}
                className="mt-4 rounded-xl bg-[#EA580C] px-4 py-2 text-sm font-bold text-white"
              >
                Try Again
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                <CalendarDays className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-xl font-bold">
                No events yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                Create your first event and start
                managing registrations, attendees,
                QR data, and badges.
              </p>

              <Link
                href="/events/create"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event, index) => (
                <motion.article
                  key={event._id}
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.04,
                  }}
                  className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                          <CalendarDays className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold">
                            {event.name}
                          </h3>

                          <p className="mt-1 text-xs font-bold tracking-wide text-[#EA580C]">
                            {event.code}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
                          event.status,
                        )}`}
                      >
                        {getStatusLabel(
                          event.status,
                        )}
                      </span>
                    </div>

                    <p className="mt-5 line-clamp-2 min-h-10 text-sm leading-5 text-stone-500">
                      {event.description ||
                        "No event description has been added yet."}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-stone-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Start date
                        </div>

                        <p className="mt-1 text-xs font-semibold text-stone-700">
                          {formatDate(
                            event.startDate,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-stone-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <MapPin className="h-3.5 w-3.5" />
                          Location
                        </div>

                        <p className="mt-1 truncate text-xs font-semibold text-stone-700">
                          {event.location ||
                            "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-stone-100 p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#EA580C]" />

                          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                            Attendees
                          </span>
                        </div>

                        <p className="mt-2 text-xl font-bold">
                          {(
                            event.attendeeCount ||
                            0
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-stone-100 p-4">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-[#EA580C]" />

                          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                            Badges
                          </span>
                        </div>

                        <p className="mt-2 text-xl font-bold">
                          {(
                            event.badgeCount ||
                            0
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* EVENT ACTIONS */}
                    <div className="mt-6 grid gap-2 sm:grid-cols-3">
                      <Link
                        href={`/events/${event._id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#241000] px-4 text-xs font-bold text-white transition hover:bg-[#3b1b08]"
                      >
                        Open Event
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      <Link
                        href={`/events/${event._id}/attendees`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Attendees
                      </Link>

                      <Link
                        href={`/events/${event._id}/attendees/import`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-xs font-bold text-[#EA580C] transition hover:bg-orange-100"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Import
                      </Link>
                    </div>

                    <Link
                      href={`/events/${event._id}`}
                      className="mt-3 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-semibold text-stone-400 transition group-hover:text-[#EA580C]"
                    >
                      <span>
                        Manage this event
                      </span>

                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}