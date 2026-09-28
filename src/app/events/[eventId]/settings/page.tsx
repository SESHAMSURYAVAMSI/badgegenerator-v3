"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  MapPin,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type EventStatus =
  | "draft"
  | "active"
  | "completed";

interface EventData {
  _id: string;
  name: string;
  slug: string;
  code: string;
  publicId: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  location: string;
  status: EventStatus;
  attendeeCount: number;
  badgeCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface EventApiResponse {
  success: boolean;
  message?: string;
  event?: EventData;
}

interface PublicPortalResponse {
  success: boolean;
  message?: string;
  publicId?: string;
  publicUrl?: string;
  permanent?: boolean;
  event?: {
    name: string;
    status: EventStatus;
  };
}

interface DeleteApiResponse {
  success: boolean;
  message?: string;
}

const statusOptions: {
  value: EventStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "draft",
    label: "Draft",
    description:
      "Event is still being prepared.",
  },
  {
    value: "active",
    label: "Active",
    description:
      "Event is currently available for use.",
  },
  {
    value: "completed",
    label: "Completed",
    description:
      "Event has finished.",
  },
];

function formatDateTimeLocal(
  value: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");
  const hours = String(
    date.getHours(),
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatReadableDate(
  value: string | null,
): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function getStatusStyles(
  status: EventStatus,
) {
  switch (status) {
    case "active":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
      };

    case "completed":
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-700",
        dot: "bg-slate-500",
      };

    case "draft":
    default:
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
  }
}

export default function EventSettingsPage() {
  const params = useParams<{
    eventId: string;
  }>();

  const router = useRouter();

  const eventId = params.eventId;

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [status, setStatus] =
    useState<EventStatus>("draft");

  const [publicUrl, setPublicUrl] =
    useState("");

  const [publicId, setPublicId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [copying, setCopying] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadEvent = useCallback(
    async () => {
      if (!eventId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/events/${eventId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data: EventApiResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Failed to load event.",
          );
        }

        if (!data.event) {
          throw new Error(
            "Event data was not returned.",
          );
        }

        const loadedEvent =
          data.event;

        setEvent(loadedEvent);

        setName(loadedEvent.name);
        setDescription(
          loadedEvent.description ?? "",
        );
        setLocation(
          loadedEvent.location ?? "",
        );
        setStartDate(
          formatDateTimeLocal(
            loadedEvent.startDate,
          ),
        );
        setEndDate(
          formatDateTimeLocal(
            loadedEvent.endDate,
          ),
        );
        setStatus(
          loadedEvent.status,
        );

        if (loadedEvent.publicId) {
          setPublicId(
            loadedEvent.publicId,
          );
        }

        /*
         * Load the permanent public
         * portal URL.
         *
         * This endpoint also creates
         * the publicId for older events
         * that don't have one yet.
         */
        const portalResponse =
          await fetch(
            `/api/events/${eventId}/public-portal`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const portalData: PublicPortalResponse =
          await portalResponse.json();

        if (
          portalResponse.ok &&
          portalData.success
        ) {
          if (
            portalData.publicUrl
          ) {
            setPublicUrl(
              portalData.publicUrl,
            );
          }

          if (
            portalData.publicId
          ) {
            setPublicId(
              portalData.publicId,
            );
          }
        }
      } catch (loadError) {
        console.error(
          "Load event settings error:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load event.",
        );
      } finally {
        setLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSave = async (
    formEvent: FormEvent<HTMLFormElement>,
  ) => {
    formEvent.preventDefault();

    if (!eventId) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!name.trim()) {
        throw new Error(
          "Event name is required.",
        );
      }

      if (
        startDate &&
        endDate &&
        new Date(endDate).getTime() <
          new Date(startDate).getTime()
      ) {
        throw new Error(
          "End date cannot be earlier than the start date.",
        );
      }

      const response = await fetch(
        `/api/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim(),
            location:
              location.trim(),
            startDate:
              startDate || null,
            endDate:
              endDate || null,
            status,
          }),
        },
      );

      const data: EventApiResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to update event.",
        );
      }

      if (data.event) {
        setEvent(data.event);

        setName(data.event.name);
        setDescription(
          data.event.description ?? "",
        );
        setLocation(
          data.event.location ?? "",
        );
        setStartDate(
          formatDateTimeLocal(
            data.event.startDate,
          ),
        );
        setEndDate(
          formatDateTimeLocal(
            data.event.endDate,
          ),
        );
        setStatus(
          data.event.status,
        );
      }

      setSuccess(
        "Event settings saved successfully.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (saveError) {
      console.error(
        "Save event settings error:",
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update event.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPublicUrl =
    async () => {
      if (!publicUrl) {
        return;
      }

      try {
        setCopying(true);

        await navigator.clipboard.writeText(
          publicUrl,
        );

        setSuccess(
          "Public portal URL copied to clipboard.",
        );

        window.setTimeout(() => {
          setSuccess("");
        }, 2500);
      } catch (copyError) {
        console.error(
          "Copy public URL error:",
          copyError,
        );

        setError(
          "Unable to copy the public URL.",
        );
      } finally {
        setCopying(false);
      }
    };

  const handleDeleteEvent =
    async () => {
      if (!eventId) {
        return;
      }

      setDeleting(true);
      setError("");

      try {
        const response = await fetch(
          `/api/events/${eventId}`,
          {
            method: "DELETE",
          },
        );

        const data: DeleteApiResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Failed to delete event.",
          );
        }

        router.replace("/events");
      } catch (deleteError) {
        console.error(
          "Delete event error:",
          deleteError,
        );

        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete event.",
        );

        setDeleting(false);
      }
    };

  const statusStyles = getStatusStyles(
    status,
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf7]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100">
              <Loader2 className="h-6 w-6 animate-spin text-[#EA580C]" />
            </div>

            <p className="text-sm font-medium text-[#6b4a3a]">
              Loading event settings...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-[#fffaf7]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border border-red-100 bg-white p-8 text-center shadow-[0_20px_60px_rgba(36,16,0,0.08)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <TriangleAlert className="h-6 w-6 text-red-500" />
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#241000]">
              Unable to load event
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#765c4d]">
              {error ||
                "The event could not be found or you don't have access to it."}
            </p>

            <Link
              href="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c94708]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf7]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/events/${eventId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#765c4d] transition hover:text-[#EA580C]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#EA580C]">
                <Settings2 className="h-3.5 w-3.5" />
                Event Settings
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[#241000] sm:text-4xl">
                {event.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#765c4d]">
                Manage the event information,
                schedule, status, and public
                portal settings.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${statusStyles.badge}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
              />
              {statusOptions.find(
                (item) =>
                  item.value ===
                  status,
              )?.label ?? status}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1 leading-6">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Success
              </p>

              <p className="mt-1 leading-6">
                {success}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main settings */}
          <form
            onSubmit={handleSave}
            className="space-y-6"
          >
            {/* Basic Information */}
            <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_18px_50px_rgba(36,16,0,0.06)]">
              <div className="border-b border-orange-50 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                    <FileText className="h-5 w-5 text-[#EA580C]" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-[#241000]">
                      Basic Information
                    </h2>

                    <p className="mt-1 text-sm text-[#80685a]">
                      Update the information
                      displayed throughout
                      your event workspace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-7">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3b2418]">
                    Event Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(inputEvent) =>
                      setName(
                        inputEvent.target
                          .value,
                      )
                    }
                    maxLength={200}
                    placeholder="Enter event name"
                    className="w-full rounded-2xl border border-orange-100 bg-[#fffdfb] px-4 py-3.5 text-sm text-[#241000] outline-none transition placeholder:text-[#b59d8f] focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />

                  <p className="mt-2 text-xs text-[#9a8172]">
                    {name.length}/200 characters
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3b2418]">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(inputEvent) =>
                      setDescription(
                        inputEvent.target
                          .value,
                      )
                    }
                    maxLength={5000}
                    rows={5}
                    placeholder="Describe your event..."
                    className="w-full resize-none rounded-2xl border border-orange-100 bg-[#fffdfb] px-4 py-3.5 text-sm leading-6 text-[#241000] outline-none transition placeholder:text-[#b59d8f] focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />

                  <p className="mt-2 text-xs text-[#9a8172]">
                    {description.length}/5000
                    characters
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3b2418]">
                    Location
                  </label>

                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a88978]" />

                    <input
                      type="text"
                      value={location}
                      onChange={(inputEvent) =>
                        setLocation(
                          inputEvent.target
                            .value,
                        )
                      }
                      maxLength={500}
                      placeholder="Event venue or location"
                      className="w-full rounded-2xl border border-orange-100 bg-[#fffdfb] py-3.5 pl-11 pr-4 text-sm text-[#241000] outline-none transition placeholder:text-[#b59d8f] focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule */}
            <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_18px_50px_rgba(36,16,0,0.06)]">
              <div className="border-b border-orange-50 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                    <CalendarDays className="h-5 w-5 text-[#EA580C]" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-[#241000]">
                      Event Schedule
                    </h2>

                    <p className="mt-1 text-sm text-[#80685a]">
                      Set when your event starts
                      and ends.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-7">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3b2418]">
                    Start Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(inputEvent) =>
                      setStartDate(
                        inputEvent.target
                          .value,
                      )
                    }
                    className="w-full rounded-2xl border border-orange-100 bg-[#fffdfb] px-4 py-3.5 text-sm text-[#241000] outline-none transition focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#3b2418]">
                    End Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(inputEvent) =>
                      setEndDate(
                        inputEvent.target
                          .value,
                      )
                    }
                    className="w-full rounded-2xl border border-orange-100 bg-[#fffdfb] px-4 py-3.5 text-sm text-[#241000] outline-none transition focus:border-[#EA580C] focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            </section>

            {/* Status */}
            <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_18px_50px_rgba(36,16,0,0.06)]">
              <div className="border-b border-orange-50 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50">
                    <CheckCircle2 className="h-5 w-5 text-[#EA580C]" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-[#241000]">
                      Event Status
                    </h2>

                    <p className="mt-1 text-sm text-[#80685a]">
                      Control the current
                      lifecycle state of this
                      event.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-3 sm:p-7">
                {statusOptions.map(
                  (option) => {
                    const selected =
                      status ===
                      option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setStatus(
                            option.value,
                          )
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-[#EA580C] bg-orange-50 ring-2 ring-orange-100"
                            : "border-orange-100 bg-white hover:border-orange-200 hover:bg-[#fffaf7]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`text-sm font-bold ${
                              selected
                                ? "text-[#EA580C]"
                                : "text-[#3b2418]"
                            }`}
                          >
                            {option.label}
                          </span>

                          {selected && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EA580C] text-white">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs leading-5 text-[#80685a]">
                          {
                            option.description
                          }
                        </p>
                      </button>
                    );
                  },
                )}
              </div>
            </section>

            {/* Save */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/events/${eventId}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-white px-5 py-3.5 text-sm font-semibold text-[#5c4032] transition hover:border-orange-200 hover:bg-orange-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#EA580C] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(234,88,12,0.22)] transition hover:bg-[#c94708] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Event Overview */}
            <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-[0_18px_50px_rgba(36,16,0,0.06)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#241000]">
                  <UserRound className="h-4 w-4 text-orange-100" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#241000]">
                    Event Overview
                  </h2>

                  <p className="text-xs text-[#80685a]">
                    Current event information
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#80685a]">
                    Attendees
                  </span>

                  <span className="text-sm font-bold text-[#241000]">
                    {event.attendeeCount}
                  </span>
                </div>

                <div className="h-px bg-orange-50" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#80685a]">
                    Generated Badges
                  </span>

                  <span className="text-sm font-bold text-[#241000]">
                    {event.badgeCount}
                  </span>
                </div>

                <div className="h-px bg-orange-50" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#80685a]">
                    Event Code
                  </span>

                  <span className="rounded-lg bg-orange-50 px-2.5 py-1 font-mono text-xs font-bold text-[#EA580C]">
                    {event.code}
                  </span>
                </div>

                <div className="h-px bg-orange-50" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#80685a]">
                    Created
                  </span>

                  <span className="text-right text-xs font-medium text-[#3b2418]">
                    {formatReadableDate(
                      event.createdAt,
                    )}
                  </span>
                </div>
              </div>
            </section>

            {/* Permanent Public Portal */}
            <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_18px_50px_rgba(36,16,0,0.06)]">
              <div className="bg-gradient-to-br from-[#241000] to-[#4a1e05] p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <Globe2 className="h-5 w-5 text-orange-200" />
                    </div>

                    <h2 className="text-lg font-bold">
                      Public Portal
                    </h2>

                    <p className="mt-1 text-sm leading-5 text-orange-100/70">
                      Your attendee-facing event
                      portal.
                    </p>
                  </div>

                  <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Permanent
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9a8172]">
                    Public URL
                  </p>

                  <div className="rounded-2xl border border-orange-100 bg-[#fffaf7] p-3">
                    <p className="break-all text-xs font-medium leading-5 text-[#5c4032]">
                      {publicUrl ||
                        "Generating public URL..."}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9a8172]">
                    Public ID
                  </p>

                  <div className="rounded-2xl border border-orange-100 bg-white p-3">
                    <p className="break-all font-mono text-[11px] text-[#765c4d]">
                      {publicId ||
                        "Not available"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                    <p className="text-xs leading-5 text-emerald-700">
                      This public URL is
                      permanently assigned to
                      this event. Saving event
                      settings will not change
                      it.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={
                      handleCopyPublicUrl
                    }
                    disabled={
                      copying ||
                      !publicUrl
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-100 bg-white px-3 py-3 text-xs font-bold text-[#5c4032] transition hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Clipboard className="h-3.5 w-3.5" />
                    )}

                    {copying
                      ? "Copying..."
                      : "Copy URL"}
                  </button>

                  <a
                    href={publicUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#EA580C] px-3 py-3 text-xs font-bold text-white transition hover:bg-[#c94708] ${
                      !publicUrl
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Portal
                  </a>
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-[0_18px_50px_rgba(127,29,29,0.05)]">
              <div className="border-b border-red-100 bg-red-50/60 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                    <TriangleAlert className="h-5 w-5 text-red-600" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-red-800">
                      Danger Zone
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-red-700/80">
                      Destructive event actions
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-sm font-bold text-[#3b2418]">
                  Delete this event
                </h3>

                <p className="mt-2 text-xs leading-5 text-[#80685a]">
                  Permanently deletes this event,
                  all attendees, and its badge
                  configuration. This action
                  cannot be undone.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirm(
                      true,
                    )
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Event
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241000]/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white shadow-[0_30px_100px_rgba(36,16,0,0.22)]">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <TriangleAlert className="h-6 w-6 text-red-600" />
              </div>

              <h2 className="mt-5 text-xl font-bold text-[#241000]">
                Delete this event?
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#765c4d]">
                You are about to permanently
                delete{" "}
                <span className="font-bold text-[#241000]">
                  {event.name}
                </span>
                .
              </p>
            </div>

            <div className="space-y-3 p-6">
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-800">
                  The following will be
                  permanently removed:
                </p>

                <ul className="mt-2 space-y-1.5 text-xs text-red-700">
                  <li>
                    • Event information
                  </li>

                  <li>
                    • {event.attendeeCount}{" "}
                    attendee record
                    {event.attendeeCount === 1
                      ? ""
                      : "s"}
                  </li>

                  <li>
                    • Badge configuration
                  </li>

                  <li>
                    • Event's public portal
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirm(
                      false,
                    )
                  }
                  disabled={deleting}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-[#5c4032] transition hover:bg-orange-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteEvent
                  }
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}