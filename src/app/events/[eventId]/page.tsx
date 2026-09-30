"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  FileText,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
  Settings2,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";

import PublicBadgePortalCard from "@/components/events/PublicBadgePortalCard";

interface EventData {
  _id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  location: string;
  status: "draft" | "active" | "completed";
  attendeeCount: number;
  badgeCount: number;
  createdAt: string;
  updatedAt: string;
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not scheduled";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(
  status: EventData["status"],
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
  status: EventData["status"],
) {
  if (status === "active") {
    return "Active";
  }

  if (status === "completed") {
    return "Completed";
  }

  return "Draft";
}

export default function EventWorkspacePage() {
  const params = useParams<{
    eventId: string;
  }>();

  const eventId = params.eventId;

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadEvent() {
    if (!eventId) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `/api/events/${eventId}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch event.",
        );
      }

      setEvent(data.event);
    } catch (error) {
      console.error(
        "Failed to load event:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch event.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-5 py-8 text-[#241000] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="h-10 w-40 animate-pulse rounded-xl bg-stone-200" />

          <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white shadow-sm" />

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-2xl bg-white shadow-sm"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-5 py-8 text-[#241000] sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <FileText className="h-8 w-8" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Unable to load event
            </h1>

            <p className="mt-2 text-sm text-stone-500">
              {error ||
                "The requested event could not be found."}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadEvent}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c]"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>

              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Events
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
            href="/events"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20 transition-transform group-hover:scale-105">
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
                Event Workspace
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
            >
              <ArrowLeft className="h-4 w-4" />

              <span className="hidden sm:inline">
                All Events
              </span>

              <span className="sm:hidden">
                Back
              </span>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* EVENT HERO */}
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-[#fff7ed] via-white to-[#fef3c7]/30 p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-64 w-64 rounded-full bg-orange-200/20 blur-3xl" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${getStatusClasses(
                      event.status,
                    )}`}
                  >
                    {getStatusLabel(event.status)}
                  </span>

                  <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    {event.code}
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  {event.name}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-500 sm:text-base">
                  {event.description ||
                    "Manage attendees, configure badges, import registrations, and prepare your event for badge generation."}
                </p>

                <div className="mt-6 flex flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#EA580C]" />

                    <span>
                      {formatDate(event.startDate)}
                    </span>

                    {event.endDate && (
                      <>
                        <span className="text-stone-300">
                          →
                        </span>

                        <span>
                          {formatDate(event.endDate)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#EA580C]" />

                    <span>
                      {event.location ||
                        "Location not specified"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative shrink-0">
                <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">
                    Event Code
                  </p>

                  <p className="mt-2 text-2xl font-black tracking-wider text-[#EA580C]">
                    {event.code}
                  </p>

                  <p className="mt-2 max-w-48 text-xs leading-5 text-stone-400">
                    Use this unique code to identify
                    this event across BadgeFlow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* STATS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.05,
            }}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <Users className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {(event.attendeeCount || 0).toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Registered attendees
            </p>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
            }}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {(event.badgeCount || 0).toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Badges generated
            </p>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.15,
            }}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
              <QrCode className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {event.attendeeCount > 0
                ? "Ready"
                : "Pending"}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              QR data status
            </p>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.2,
            }}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TicketCheck className="h-5 w-5" />
            </div>

            <p className="mt-4 text-2xl font-bold">
              {event.status === "active"
                ? "Live"
                : getStatusLabel(event.status)}
            </p>

            <p className="mt-1 text-xs text-stone-500">
              Event status
            </p>
          </motion.div>
        </div>

        {/* PUBLIC BADGE PORTAL */}
        <div className="mt-8">
          <PublicBadgePortalCard
            eventId={eventId}
          />
        </div>

        {/* WORKSPACE */}
        <div className="mt-8">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#EA580C]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Event Workspace
                </div>

                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Manage your event
                </h2>

                <p className="mt-2 text-sm text-stone-500">
                  Everything you need to prepare
                  registrations and badges.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* MANAGE ATTENDEES */}
            <Link
              href={`/events/${eventId}/attendees`}
              className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] transition group-hover:scale-105">
                  <Users className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Manage Attendees
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                View registrations, add attendees,
                search records, and manage your event
                attendee list.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  {event.attendeeCount.toLocaleString()}{" "}
                  attendees
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  Open
                </span>
              </div>
            </Link>

            {/* IMPORT ATTENDEES */}
            <Link
              href={`/events/${eventId}/attendees/import`}
              className="group rounded-3xl border border-orange-200 bg-orange-50/40 p-6 shadow-sm transition hover:-translate-y-1 hover:bg-orange-50 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#EA580C] shadow-sm transition group-hover:scale-105">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-orange-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Import Attendees
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Upload Excel or CSV registrations,
                preview the rows, validate data, and
                import attendees in bulk.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-orange-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  Excel / CSV
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  Import
                </span>
              </div>
            </Link>

            {/* EVENT ANALYTICS */}
            <Link
              href={`/events/${eventId}/analytics`}
              className="group rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EA580C] text-white transition group-hover:scale-105">
                  <BarChart3 className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-orange-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Event Analytics
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Analyse registrations, badge generation,
                categories, pending badges, and
                generation rates for this event.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-orange-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  Live analytics
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  View report
                </span>
              </div>
            </Link>

            {/* EVENT SCANNING */}
            <Link
              href={`/events/${eventId}/scanning`}
              className="group rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EA580C] text-white transition group-hover:scale-105">
                  <ScanLine className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-orange-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Scanning Module
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Configure scanning days, breakfast, lunch,
                dinner, kit bag, certificates, and custom
                modules for this event.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-orange-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  Configure scanning
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  Open
                </span>
              </div>
            </Link>

            {/* SCANNING DASHBOARD */}
            <Link
              href={`/events/${eventId}/scanning/dashboard`}
              className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] transition group-hover:scale-105">
                  <BarChart3 className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Scanning Dashboard
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Monitor successful scans, duplicate attempts,
                attendee coverage, module performance, and
                live scanning activity.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  Live analytics
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  View dashboard
                </span>
              </div>
            </Link>

            {/* BADGE CONFIGURATION */}
            <Link
              href={`/events/${eventId}/badge`}
              className="group rounded-3xl border border-orange-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] transition group-hover:scale-105">
                  <Settings2 className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Badge Configuration
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Design your event badge, configure
                fields, set QR placement, typography,
                colors, and badge layout.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  Open Designer
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  Configure
                </span>
              </div>
            </Link>

            {/* BADGE GENERATION */}
            {/* <div className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-orange-200 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C]">
                  <BadgeCheck className="h-6 w-6" />
                </div>

                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-stone-400">
                  Coming Next
                </span>
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Badge Generation
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Generate attendee badges from your
                saved badge configuration.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  {event.badgeCount.toLocaleString()}{" "}
                  generated
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  Prepare
                </span>
              </div>
            </div> */}

            {/* EVENT SETTINGS */}
            <Link
              href={`/events/${eventId}/settings`}
              className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#EA580C] transition group-hover:scale-105">
                  <Settings2 className="h-6 w-6" />
                </div>

                <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1 group-hover:text-[#EA580C]" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                Event Settings
              </h3>

              <p className="mt-2 text-sm leading-6 text-stone-500">
                Update event details, dates, location,
                status, and event-specific configuration.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-[#EA580C]">
                  Open Settings
                </span>

                <span className="text-xs font-semibold text-stone-400">
                  Configure
                </span>
              </div>
            </Link>

            {/* BADGEFLOW INFO */}
            <div className="rounded-3xl border border-stone-200 bg-[#241000] p-6 text-white shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EA580C]">
                <Sparkles className="h-6 w-6" />
              </div>

              <h3 className="mt-6 text-lg font-bold">
                BadgeFlow
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/60">
                Your event workspace connects
                registrations, attendee data, QR
                values, and badge generation in one
                workflow.
              </p>

              <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-semibold text-white/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400" />
                Event workspace ready
              </div>
            </div>
          </div>
        </div>

        {/* SETUP CHECKLIST */}
        <div className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#EA580C]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Setup Checklist
              </div>

              <h2 className="mt-2 text-xl font-bold">
                Prepare this event
              </h2>
            </div>

            <span className="text-xs text-stone-400">
              {event.attendeeCount > 0
                ? "Registration data available"
                : "Waiting for registrations"}
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* ATTENDEES */}
            <Link
              href={`/events/${eventId}/attendees`}
              className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition hover:border-orange-200 hover:bg-orange-50/50"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  event.attendeeCount > 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-orange-50 text-[#EA580C]"
                }`}
              >
                {event.attendeeCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Add attendees
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  {event.attendeeCount > 0
                    ? `${event.attendeeCount.toLocaleString()} attendees added`
                    : "Add manually or import Excel"}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            {/* BADGES */}
            <Link
              href={`/events/${eventId}/badge`}
              className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition hover:border-orange-200 hover:bg-orange-50/50"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  event.badgeCount > 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-orange-50 text-[#EA580C]"
                }`}
              >
                {event.badgeCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <BadgeCheck className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Badge setup
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  {event.badgeCount > 0
                    ? `${event.badgeCount.toLocaleString()} badges generated`
                    : "Configure badge design"}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            {/* SCANNING */}
            <Link
              href={`/events/${eventId}/scanning`}
              className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition hover:border-orange-200 hover:bg-orange-50/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <ScanLine className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Scanning setup
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Configure event days and scanning modules
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            {/* ANALYTICS */}
            <Link
              href={`/events/${eventId}/analytics`}
              className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition hover:border-orange-200 hover:bg-orange-50/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Event analytics
                </p>

                <p className="mt-1 text-xs text-stone-400">
                  Review registration and badge progress
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-stone-400">
          <Clock3 className="h-3.5 w-3.5" />

          Last updated{" "}
          {formatDateTime(event.updatedAt)}
        </div>
      </section>
    </main>
  );
}