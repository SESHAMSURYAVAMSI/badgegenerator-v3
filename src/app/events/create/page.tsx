"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  FileText,
  Loader2,
  MapPin,
  Save,
  Sparkles,
  Users,
} from "lucide-react";

type EventStatus = "draft" | "active";

interface EventFormData {
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
}

const initialForm: EventFormData = {
  name: "",
  description: "",
  location: "",
  startDate: "",
  endDate: "",
  status: "draft",
};

function formatDate(date: string) {
  if (!date) return "Not selected";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Not selected";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CreateEventPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<EventFormData>(initialForm);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  function updateField<K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      form.endDate < form.startDate
    ) {
      setError(
        "End date cannot be earlier than the start date.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          status: form.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create event.",
        );
      }

      router.push("/events");
      router.refresh();
    } catch (error) {
      console.error("Create event error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create event.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#241000]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-200/25 blur-3xl" />

        <div className="absolute bottom-[-10rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      {/* Header */}
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
                <span className="text-[#EA580C]">Flow</span>
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Event Management
              </div>
            </div>
          </Link>

          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#EA580C]"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">
              Back to Events
            </span>

            <span className="sm:hidden">
              Back
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#EA580C]">
            <Sparkles className="h-3.5 w-3.5" />
            Event Setup
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Create a new event
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
            Set up the foundation for your conference. You can
            configure attendees, badge designs and QR settings
            after creation.
          </p>
        </motion.div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          {/* Left side */}
          <div className="space-y-6">
            {/* Basic Information */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="border-b border-stone-100 bg-gradient-to-r from-orange-50/70 to-white px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EA580C] text-white shadow-lg shadow-orange-600/20">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold">
                      Basic Information
                    </h2>

                    <p className="mt-0.5 text-xs text-stone-400">
                      Give your event its identity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                {/* Name */}
                <div>
                  <label
                    htmlFor="event-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Event name
                    <span className="ml-1 text-[#EA580C]">
                      *
                    </span>
                  </label>

                  <input
                    id="event-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. RSACPCON 2026"
                    required
                    maxLength={150}
                    className="h-13 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />

                  <div className="mt-2 flex justify-between text-xs text-stone-400">
                    <span>
                      This name will appear across BadgeFlow.
                    </span>

                    <span>
                      {form.name.length}/150
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="event-description"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Description
                  </label>

                  <textarea
                    id="event-description"
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value,
                      )
                    }
                    placeholder="Briefly describe your conference or event..."
                    rows={5}
                    maxLength={1000}
                    className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />

                  <p className="mt-2 text-right text-xs text-stone-400">
                    {form.description.length}/1000
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label
                    htmlFor="event-location"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Location
                  </label>

                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

                    <input
                      id="event-location"
                      type="text"
                      value={form.location}
                      onChange={(event) =>
                        updateField(
                          "location",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Hyderabad International Convention Centre"
                      className="h-13 w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-11 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Dates */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="border-b border-stone-100 bg-gradient-to-r from-orange-50/70 to-white px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold">
                      Event Dates
                    </h2>

                    <p className="mt-0.5 text-xs text-stone-400">
                      Define when your event takes place.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Start date
                  </label>

                  <input
                    id="start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      updateField(
                        "startDate",
                        event.target.value,
                      )
                    }
                    className="h-13 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-2 block text-sm font-semibold"
                  >
                    End date
                  </label>

                  <input
                    id="end-date"
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(event) =>
                      updateField(
                        "endDate",
                        event.target.value,
                      )
                    }
                    className="h-13 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm outline-none transition focus:border-[#EA580C] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>
              </div>
            </motion.section>

            {/* Status */}
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
                <h2 className="text-lg font-bold">
                  Event Status
                </h2>

                <p className="mt-1 text-xs text-stone-400">
                  Choose how this event should start.
                </p>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
                {/* Draft */}
                <button
                  type="button"
                  onClick={() =>
                    updateField("status", "draft")
                  }
                  className={`relative rounded-2xl border p-5 text-left transition ${
                    form.status === "draft"
                      ? "border-orange-300 bg-orange-50/70 ring-2 ring-orange-500/10"
                      : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                  }`}
                >
                  {form.status === "draft" && (
                    <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#EA580C] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <FileText className="h-4 w-4" />
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    Draft
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-stone-500">
                    Keep the event private while you finish
                    configuring it.
                  </p>
                </button>

                {/* Active */}
                <button
                  type="button"
                  onClick={() =>
                    updateField("status", "active")
                  }
                  className={`relative rounded-2xl border p-5 text-left transition ${
                    form.status === "active"
                      ? "border-orange-300 bg-orange-50/70 ring-2 ring-orange-500/10"
                      : "border-stone-200 bg-white hover:border-orange-200 hover:bg-orange-50/30"
                  }`}
                >
                  {form.status === "active" && (
                    <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#EA580C] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <BadgeCheck className="h-4 w-4" />
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    Active
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-stone-500">
                    Make the event active and ready for
                    management.
                  </p>
                </button>
              </div>
            </motion.section>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/events"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-200 bg-white px-6 text-sm font-semibold text-stone-600 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-7 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-[#c2410c] hover:shadow-orange-600/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Event
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview */}
          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-[#241000] to-[#4a1f00] p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                      Live Preview
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      Event Workspace
                    </h2>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <Sparkles className="h-4 w-4 text-orange-300" />
                  </div>
                </div>

                <div className="mt-7 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EA580C]">
                    <BadgeCheck className="h-5 w-5" />
                  </div>

                  <h3 className="mt-5 line-clamp-2 text-xl font-bold">
                    {form.name.trim() ||
                      "Your Event Name"}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/60">
                    {form.description.trim() ||
                      "Your event description will appear here once you add it."}
                  </p>

                  <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <CalendarDays className="h-3.5 w-3.5 text-orange-300" />

                      <span>
                        {formatDate(form.startDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <MapPin className="h-3.5 w-3.5 text-orange-300" />

                      <span className="truncate">
                        {form.location.trim() ||
                          "Event location"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">
                  After creation
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#EA580C]">
                      <Users className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold">
                        Attendee Management
                      </p>

                      <p className="text-[11px] text-stone-400">
                        Import and manage registrations
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#EA580C]">
                      <BadgeCheck className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold">
                        Badge Configuration
                      </p>

                      <p className="text-[11px] text-stone-400">
                        Build professional event badges
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#EA580C]">
                      <Sparkles className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold">
                        QR & Badge Generation
                      </p>

                      <p className="text-[11px] text-stone-400">
                        Generate and download badges
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </form>
      </section>
    </main>
  );
}