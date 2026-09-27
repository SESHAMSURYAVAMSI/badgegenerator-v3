"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  Loader2,
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
  startDate?: string;
  endDate?: string;
  location?: string;
  status: "draft" | "active" | "completed";
  attendeeCount: number;
  badgeCount: number;
  createdAt: string;
  updatedAt: string;
}

function formatDate(date?: string) {
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
  const [events, setEvents] = useState<
    EventItem[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

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

  useEffect(() => {
    loadEvents();
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

            <span className="rounded-lg px-3 py-2 text-sm font-medium text-stone-400">
              Attendees
            </span>

            <span className="rounded-lg px-3 py-2 text-sm font-medium text-stone-400">
              Analytics
            </span>

            <span className="rounded-lg px-3 py-2 text-sm font-medium text-stone-400">
              Badge Templates
            </span>

            <span className="rounded-lg px-3 py-2 text-sm font-medium text-stone-400">
              Settings
            </span>
          </nav>

          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c]"
          >
            <Plus className="h-4 w-4" />

            <span className="hidden sm:inline">
              Create Event
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#EA580C]">
              <Sparkles className="h-3.5 w-3.5" />
              Event Workspace
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Your Events
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              Create, manage, import attendees,
              configure badges, and generate
              professional event credentials from
              one workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={loadEvents}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </button>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <CalendarDays className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {totalEvents}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Total events
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {activeEvents}
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
              Total attendees
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

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Unable to load events.
                </p>

                <p className="mt-1 text-xs text-red-500">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={loadEvents}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-3xl bg-white shadow-sm"
                />
              ),
            )}
          </div>
        ) : events.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-stone-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
              <CalendarDays className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              No events yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Create your first event and start
              managing attendees and professional
              badges.
            </p>

            <Link
              href="/events/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 hover:bg-[#c2410c]"
            >
              <Plus className="h-4 w-4" />
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {events.map(
              (event, index) => (
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
                    delay: Math.min(
                      index * 0.05,
                      0.25,
                    ),
                  }}
                  className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5"
                >
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                          <CalendarDays className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-bold">
                            {event.name}
                          </h2>

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
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}